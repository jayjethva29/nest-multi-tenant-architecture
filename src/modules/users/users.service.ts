import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { TenantConnectionManager } from '../../core/connection/tenant-connection.manager';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly tenantConnectionManager: TenantConnectionManager,
    private readonly configService: ConfigService,
  ) {}

  async createUser(tenantId: string, createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const userRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, User);

    // Check if user with email already exists
    const existingUser = await userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email '${createUserDto.email}' already exists`);
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

    this.logger.log(`User created: ${savedUser.email} (${savedUser.role}) for tenant: ${tenantId}`);

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

  async createAdminUser(
    tenantId: string,
    adminData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
  ): Promise<UserResponseDto> {
    return this.createUser(tenantId, {
      ...adminData,
      role: 'admin',
    });
  }

  async getAllUsers(tenantId: string): Promise<UserResponseDto[]> {
    const userRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, User);

    const users = await userRepository.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  async findUserById(tenantId: string, userId: string): Promise<UserResponseDto> {
    const userRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, User);

    const user = await userRepository.findOne({
      where: { id: userId, active: true },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
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
}
