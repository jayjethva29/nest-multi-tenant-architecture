#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { TenantService } from '../src/core/tenant/tenant.service';

async function createTenant() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npm run create:tenant <tenantName> [adminEmail] [adminPassword]');
    console.error('Example: npm run create:tenant "ACME Corporation" admin@acme.com password123');
    process.exit(1);
  }

  const [tenantName, adminEmail, adminPassword] = args;

  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    const configService = app.get(ConfigService);
    const tenantService = app.get(TenantService);

    console.log(`Creating tenant: ${tenantName}`);

    const createTenantDto = {
      name: tenantName,
      database: {
        host: configService.get('CENTRAL_DB_HOST'),
        port: configService.get('CENTRAL_DB_PORT'),
        username: configService.get('CENTRAL_DB_USER'),
        password: configService.get('CENTRAL_DB_PASS'),
      },
      poolOptions: {
        max: 5,
        min: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        idleTimeoutMillis: 30000,
      },
    };

    // Add admin user if provided
    if (adminEmail && adminPassword) {
      createTenantDto['adminUser'] = {
        email: adminEmail,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
      };
    }

    const result = await tenantService.createTenant(createTenantDto);

    console.log('✅ Tenant created successfully!');
    console.log(`Tenant ID: ${result.id}`);
    console.log(`Tenant Name: ${result.name}`);
    console.log(`Status: ${result.status}`);

    if (result.adminToken) {
      console.log(`Admin Token: ${result.adminToken}`);
      console.log('\n🔑 Use this token for API authentication:');
      console.log(`Authorization: Bearer ${result.adminToken}`);
    }

    await app.close();
  } catch (error) {
    console.error('❌ Failed to create tenant:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createTenant();
}
