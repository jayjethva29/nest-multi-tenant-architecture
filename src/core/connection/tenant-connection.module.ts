import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantConnectionManager } from './tenant-connection.manager';
import { Tenant } from '../tenant/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantConnectionManager],
  exports: [TenantConnectionManager],
})
export class TenantConnectionModule {}
