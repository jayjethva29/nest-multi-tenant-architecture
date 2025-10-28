import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tenant } from './tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantResponseDto } from './dto/tenant-response.dto';
import { AuthService } from '../../modules/auth/auth.service';
import { createTenantDataSource } from '../../config/typeorm.config';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async createTenant(createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    let tenant: Tenant;
    let adminToken: string | undefined;
    let status: 'provisioned' | 'failed' | 'pending' = 'pending';

    try {
      // Create tenant entry in central registry
      tenant = this.tenantRepository.create({
        name: createTenantDto.name,
        dbHost: createTenantDto.database.host,
        dbPort: createTenantDto.database.port || 5432,
        dbName: '', // Will be set after saving to get the UUID
        dbUser: createTenantDto.database.username,
        dbPassword: createTenantDto.database.password,
        poolOptions: createTenantDto.poolOptions,
        active: true,
      });

      // Save tenant to get the generated UUID
      await this.tenantRepository.save(tenant);

      // Update dbName with the tenant ID
      tenant.dbName = `tenant_${tenant.id.replace(/-/g, '_')}`;
      await this.tenantRepository.save(tenant);

      this.logger.log(`Tenant registry entry created: ${tenant.id}`);

      // Provision tenant database
      await this.provisionTenantDatabase(tenant);
      this.logger.log(`Tenant database provisioned: ${tenant.id}`);

      // Run migrations for tenant database
      await this.runTenantMigrations(tenant);
      this.logger.log(`Tenant migrations completed: ${tenant.id}`);

      // Create admin user if provided
      if (createTenantDto.adminUser) {
        const adminUser = await this.authService.createAdminUser(
          tenant.id,
          createTenantDto.adminUser,
        );

        adminToken = await this.authService.generateAdminToken(
          tenant.id,
          adminUser.id,
          adminUser.email,
        );

        this.logger.log(`Admin user created for tenant: ${tenant.id}`);
      }

      status = 'provisioned';
    } catch (error) {
      this.logger.error(`Tenant creation failed for: ${createTenantDto.name}`, error);
      status = 'failed';

      // If tenant was created but provisioning failed, mark as inactive
      if (tenant) {
        await this.tenantRepository.update(tenant.id, { active: false });
      }

      throw new BadRequestException(`Tenant creation failed: ${error.message}`);
    }

    return {
      id: tenant.id,
      name: tenant.name,
      active: tenant.active,
      createdAt: tenant.createdAt,
      adminToken,
      status,
    };
  }

  async findTenantById(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId, active: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    return tenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
  }

  private async provisionTenantDatabase(tenant: Tenant): Promise<void> {
    // Create admin connection to provision new database
    const adminDataSource = new DataSource({
      type: 'postgres',
      host: this.configService.get('ADMIN_DB_HOST'),
      port: this.configService.get('ADMIN_DB_PORT'),
      username: this.configService.get('ADMIN_DB_USER'),
      password: this.configService.get('ADMIN_DB_PASS'),
      database: 'postgres', // Connect to default postgres DB
    });

    try {
      await adminDataSource.initialize();

      // Check if database exists
      const result = await adminDataSource.query('SELECT 1 FROM pg_database WHERE datname = $1', [
        tenant.dbName,
      ]);

      if (result.length === 0) {
        // Create new database
        await adminDataSource.query(`CREATE DATABASE "${tenant.dbName}"`);
        this.logger.log(`Database created: ${tenant.dbName}`);
      } else {
        this.logger.log(`Database already exists: ${tenant.dbName}`);
      }
    } finally {
      if (adminDataSource.isInitialized) {
        await adminDataSource.destroy();
      }
    }
  }

  private async runTenantMigrations(tenant: Tenant): Promise<void> {
    const tenantDataSource = createTenantDataSource({
      host: tenant.dbHost,
      port: tenant.dbPort,
      username: tenant.dbUser,
      password: tenant.dbPassword,
      database: tenant.dbName,
      poolOptions: tenant.poolOptions,
    });

    try {
      await tenantDataSource.initialize();
      await tenantDataSource.runMigrations();
      this.logger.log(`Migrations completed for: ${tenant.dbName}`);
    } finally {
      if (tenantDataSource.isInitialized) {
        await tenantDataSource.destroy();
      }
    }
  }
}
