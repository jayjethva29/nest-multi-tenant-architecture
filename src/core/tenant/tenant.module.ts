import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { Tenant } from './tenant.entity';
import { TenantConnectionModule } from '../connection/tenant-connection.module';
import { AuthModule } from '../../modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    TenantConnectionModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService, TenantConnectionModule],
})
export class TenantModule {}
