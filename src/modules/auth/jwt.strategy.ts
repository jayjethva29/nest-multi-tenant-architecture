import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Validate that both user ID and tenant ID are present
    if (!payload.sub || !payload.tenantId) {
      throw new Error('Invalid token: missing user ID or tenant ID');
    }

    return {
      sub: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
