import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from '../tenant/tenant.entity';
import { createTenantDataSource } from '../../config/typeorm.config';

@Injectable()
export class TenantConnectionManager implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionManager.name);
  private readonly tenantConnections = new Map<string, DataSource>();
  private readonly initializationPromises = new Map<string, Promise<DataSource>>();

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  /**
   * Get or create a DataSource for the specified tenant
   * Thread-safe initialization to prevent multiple connections for the same tenant
   */
  async getDataSourceForTenant(tenantId: string): Promise<DataSource> {
    // Check if connection already exists
    const existingConnection = this.tenantConnections.get(tenantId);
    if (existingConnection && existingConnection.isInitialized) {
      return existingConnection;
    }

    // Check if initialization is already in progress
    const initPromise = this.initializationPromises.get(tenantId);
    if (initPromise) {
      return initPromise;
    }

    // Create new initialization promise
    const newInitPromise = this.initializeTenantConnection(tenantId);
    this.initializationPromises.set(tenantId, newInitPromise);

    try {
      const dataSource = await newInitPromise;
      this.tenantConnections.set(tenantId, dataSource);
      return dataSource;
    } finally {
      this.initializationPromises.delete(tenantId);
    }
  }

  /**
   * Initialize a new tenant connection
   */
  private async initializeTenantConnection(tenantId: string): Promise<DataSource> {
    this.logger.log(`Initializing connection for tenant: ${tenantId}`);

    // Look up tenant configuration in central registry
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId, active: true },
    });

    if (!tenant) {
      throw new Error(`Tenant not found or inactive: ${tenantId}`);
    }

    // Create new DataSource with tenant-specific configuration
    const dataSource = createTenantDataSource({
      host: tenant.dbHost,
      port: tenant.dbPort,
      username: tenant.dbUser,
      password: tenant.dbPassword,
      database: tenant.dbName,
      poolOptions: tenant.poolOptions,
    });

    try {
      await dataSource.initialize();
      this.logger.log(`Successfully connected to tenant database: ${tenantId}`);
      return dataSource;
    } catch (error) {
      this.logger.error(`Failed to connect to tenant database: ${tenantId}`, error);
      throw new Error(`Failed to initialize tenant connection: ${tenantId}`);
    }
  }

  /**
   * Get a repository for a specific entity from tenant database
   */
  async getTenantRepository<T>(tenantId: string, entity: new () => T): Promise<Repository<T>> {
    const dataSource = await this.getDataSourceForTenant(tenantId);
    return dataSource.getRepository(entity);
  }

  /**
   * Close a specific tenant connection
   */
  async closeTenantConnection(tenantId: string): Promise<void> {
    const connection = this.tenantConnections.get(tenantId);
    if (connection && connection.isInitialized) {
      await connection.destroy();
      this.tenantConnections.delete(tenantId);
      this.logger.log(`Closed connection for tenant: ${tenantId}`);
    }
  }

  /**
   * Close all tenant connections
   */
  async closeAllConnections(): Promise<void> {
    this.logger.log('Closing all tenant connections...');
    const closePromises = Array.from(this.tenantConnections.entries()).map(
      async ([tenantId, connection]) => {
        if (connection.isInitialized) {
          await connection.destroy();
          this.logger.log(`Closed connection for tenant: ${tenantId}`);
        }
      },
    );

    await Promise.all(closePromises);
    this.tenantConnections.clear();
    this.initializationPromises.clear();
    this.logger.log('All tenant connections closed');
  }

  /**
   * Get connection status for all tenants
   */
  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.tenantConnections.forEach((connection, tenantId) => {
      status[tenantId] = connection.isInitialized;
    });
    return status;
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    await this.closeAllConnections();
  }
}
