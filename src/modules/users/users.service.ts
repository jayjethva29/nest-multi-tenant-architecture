import { Injectable, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { TenantConnectionManager } from '../../core/connection/tenant-connection.manager';
import { assignDefaultRoleToUser } from '../../../scripts/initialize-permissions';
import {
  UserResponseMessages,
  AuthResponseMessages,
} from '../../common/constants/response-messages';
import {
  BasePaginatedService,
  QueryBuilderService,
  QueryBuilderConfig,
  PaginationResponseDto,
  QueryOptions,
  SortOrder,
} from '../../common';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class UsersService extends BasePaginatedService<User> {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private tenantConnectionManager: TenantConnectionManager,
    queryBuilderService: QueryBuilderService,
    private readonly configService: ConfigService,
  ) {
    super(queryBuilderService);
  }

  protected getEntityClass(): new () => User {
    return User;
  }

  protected getQueryBuilderConfig(): QueryBuilderConfig {
    return {
      search: {
        searchFields: ['email', 'firstName', 'lastName', 'role'],
        // Custom search logic for email domain filtering
        customSearch: (queryBuilder, searchTerm, alias) => {
          queryBuilder.andWhere(
            `(${alias}.email ILIKE :search OR ${alias}.firstName ILIKE :search OR ${alias}.lastName ILIKE :search OR ${alias}.role ILIKE :search)`,
            { search: `%${searchTerm}%` },
          );
        },
      },
      sort: {
        defaultSortField: 'createdAt',
        allowedSortFields: ['email', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt'],
        defaultSortOrder: SortOrder.DESC,
      },
      pagination: {
        defaultLimit: 10,
        maxLimit: 100,
      },
    };
  }

  private async getTenantUserRepository(tenantId: string): Promise<Repository<User>> {
    return this.tenantConnectionManager.getTenantRepository(tenantId, User);
  }

  /**
   * Find all users with advanced filtering
   */
  async findAll(tenantId: string, queryDto: UserQueryDto): Promise<PaginationResponseDto<User>> {
    const options: QueryOptions = {
      page: queryDto.page,
      limit: queryDto.limit,
      search: queryDto.search,
      sortBy: queryDto.sortBy,
      sortOrder: queryDto.sortOrder,
    };

    // Create base query with custom filters and relations
    const userRepository = await this.getTenantUserRepository(tenantId);
    const baseQuery = userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRoles');

    // Add role filter if provided
    if (queryDto.role) {
      baseQuery.andWhere('user.role = :role', { role: queryDto.role });
    }

    // Add active filter if provided
    if (queryDto.active !== undefined) {
      baseQuery.andWhere('user.active = :active', { active: queryDto.active });
    }

    // Add email domain filter if provided
    if (queryDto.emailDomain) {
      baseQuery.andWhere('user.email LIKE :emailDomain', {
        emailDomain: `%@${queryDto.emailDomain}`,
      });
    }

    return this.findWithQueryBuilder(tenantId, baseQuery, options);
  }

  /**
   * Create a new user
   */
  async createUser(tenantId: string, createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const userRepository = await this.getTenantUserRepository(tenantId);

    // Check if user with email already exists
    const existingUser = await userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException(UserResponseMessages.EMAIL_ALREADY_IN_USE);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.configService.get<number>('BCRYPT_ROUNDS', 12),
    );

    // Create user
    const user = userRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      role: createUserDto.role || 'user',
      active: true,
    });

    const savedUser = await userRepository.save(user);

    // Assign default role to the user
    try {
      const tenantDataSource = await this.tenantConnectionManager.getDataSourceForTenant(tenantId);
      await assignDefaultRoleToUser(tenantDataSource, savedUser.id);
    } catch (error) {
      this.logger.error(`Failed to assign default role to user ${savedUser.id}: ${error.message}`);
    }

    this.logger.log(`User created: ${savedUser.id} for tenant: ${tenantId}`);

    // Return response without password
    return {
      id: savedUser.id,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      role: savedUser.role,
      active: savedUser.active,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    };
  }

  /**
   * Create a new admin user
   */
  async createAdminUser(tenantId: string, userData: CreateUserDto): Promise<UserResponseDto> {
    const userRepository = await this.getTenantUserRepository(tenantId);

    // Check if user with email already exists
    const existingUser = await userRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new BadRequestException(UserResponseMessages.EMAIL_ALREADY_IN_USE);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      userData.password,
      this.configService.get<number>('BCRYPT_ROUNDS', 12),
    );

    // Create admin user with admin role
    const user = userRepository.create({
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: 'admin', // Force admin role
      active: true,
    });

    const savedUser = await userRepository.save(user);

    // Assign admin role to the user
    try {
      const tenantDataSource = await this.tenantConnectionManager.getDataSourceForTenant(tenantId);
      await assignDefaultRoleToUser(tenantDataSource, savedUser.id);
    } catch (error) {
      this.logger.error(`Failed to assign admin role to user ${savedUser.id}: ${error.message}`);
    }

    this.logger.log(`Admin user created: ${savedUser.id} for tenant: ${tenantId}`);

    // Return response without password
    return {
      id: savedUser.id,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      role: savedUser.role,
      active: savedUser.active,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    };
  }

  /**
   * Find a user by ID
   */
  async findOne(tenantId: string, id: string): Promise<UserResponseDto> {
    const userRepository = await this.getTenantUserRepository(tenantId);
    const user = await userRepository.findOne({
      where: { id },
      relations: ['userRoles'],
    });

    if (!user) {
      throw new BadRequestException(AuthResponseMessages.USER_NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Find a user by email
   */
  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const userRepository = await this.getTenantUserRepository(tenantId);
    return userRepository.findOne({
      where: { email },
      relations: ['userRoles'],
    });
  }

  /**
   * Find users by role with pagination
   */
  async findByRole(
    tenantId: string,
    role: string,
    options: Partial<QueryOptions> = {},
  ): Promise<PaginationResponseDto<User>> {
    const queryOptions: QueryOptions = {
      page: options.page || 1,
      limit: options.limit || 10,
      search: options.search,
      sortBy: options.sortBy || 'firstName',
      sortOrder: options.sortOrder || SortOrder.ASC,
    };

    const userRepository = await this.getTenantUserRepository(tenantId);
    const baseQuery = userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .where('user.role = :role', { role });

    return this.findWithQueryBuilder(tenantId, baseQuery, queryOptions);
  }

  /**
   * Find active users
   */
  async findActiveUsers(
    tenantId: string,
    options: Partial<QueryOptions> = {},
  ): Promise<PaginationResponseDto<User>> {
    const queryOptions: QueryOptions = {
      page: options.page || 1,
      limit: options.limit || 10,
      search: options.search,
      sortBy: options.sortBy || 'lastName',
      sortOrder: options.sortOrder || SortOrder.ASC,
    };

    const userRepository = await this.getTenantUserRepository(tenantId);
    const baseQuery = userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .where('user.active = :active', { active: true });

    return this.findWithQueryBuilder(tenantId, baseQuery, queryOptions);
  }

  /**
   * Search users by email domain
   */
  async findByEmailDomain(
    tenantId: string,
    domain: string,
    options: Partial<QueryOptions> = {},
  ): Promise<PaginationResponseDto<User>> {
    const queryOptions: QueryOptions = {
      page: options.page || 1,
      limit: options.limit || 10,
      search: options.search,
      sortBy: options.sortBy || 'email',
      sortOrder: options.sortOrder || SortOrder.ASC,
    };

    const userRepository = await this.getTenantUserRepository(tenantId);
    const baseQuery = userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .where('user.email LIKE :emailDomain', { emailDomain: `%@${domain}` });

    return this.findWithQueryBuilder(tenantId, baseQuery, queryOptions);
  }

  /**
   * Get user statistics for a tenant
   */
  async getUserStats(tenantId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  }> {
    const userRepository = await this.getTenantUserRepository(tenantId);

    const [total, active, roleStats] = await Promise.all([
      userRepository.count(),
      userRepository.count({ where: { active: true } }),
      userRepository
        .createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.role')
        .getRawMany(),
    ]);

    const byRole: Record<string, number> = {};
    roleStats.forEach((stat) => {
      byRole[stat.role] = parseInt(stat.count, 10);
    });

    return {
      total,
      active,
      inactive: total - active,
      byRole,
    };
  }
}
