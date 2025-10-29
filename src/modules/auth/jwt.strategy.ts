import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { TenantConnectionManager } from '../../core/connection/tenant-connection.manager';
import { User } from '../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly tenantConnectionManager: TenantConnectionManager,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Validate that both user ID and tenant ID are present
    if (!payload.id || !payload.tenantId) {
      throw new UnauthorizedException('Invalid token: missing user ID or tenant ID');
    }

    // Verify that the user still exists and is active in the database
    try {
      const userRepository = await this.tenantConnectionManager.getTenantRepository(
        payload.tenantId,
        User,
      );

      const user = await userRepository.findOne({
        where: {
          id: payload.id,
          active: true, // Only allow active users
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Optional: Check if email matches (in case email was changed)
      if (user.email !== payload.email) {
        throw new UnauthorizedException('Token email mismatch');
      }

      return {
        id: payload.id,
        tenantId: payload.tenantId,
        email: payload.email,
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
