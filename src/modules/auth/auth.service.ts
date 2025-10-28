import { Injectable, UnauthorizedException, Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { TenantConnectionManager } from '../../core/connection/tenant-connection.manager';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

export interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantConnectionManager: TenantConnectionManager,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async validateUser(tenantId: string, email: string, password: string): Promise<User | null> {
    try {
      const userRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, User);

      const user = await userRepository.findOne({
        where: { email, active: true },
      });

      if (user && (await bcrypt.compare(password, user.password))) {
        return user;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to validate user for tenant ${tenantId}:`, error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async login(tenantId: string, email: string, password: string): Promise<LoginResult> {
    const user = await this.validateUser(tenantId, email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: tenantId,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async createAdminUser(
    tenantId: string,
    userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
  ): Promise<User> {
    try {
      const userResponse = await this.usersService.createAdminUser(tenantId, userData);

      // Return the User entity (we need to fetch it from the database)
      const userRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, User);

      return await userRepository.findOne({ where: { id: userResponse.id } });
    } catch (error) {
      this.logger.error(`Failed to create admin user for tenant ${tenantId}:`, error);
      throw new Error('Failed to create admin user');
    }
  }

  async generateAdminToken(tenantId: string, userId: string, email: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      tenantId: tenantId,
      email,
    };

    return this.jwtService.sign(payload);
  }
}
