#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { TenantService } from '../src/core/tenant/tenant.service';

async function createTenant() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: npm run create:tenant <tenantName> <adminEmail> <adminPassword>');
    console.error('');
    console.error('Examples:');
    console.error('  npm run create:tenant "ACME Corporation" admin@acme.com password123');
    console.error('  npm run create:tenant "My Company" admin@company.com securePass123');
    console.error('');
    console.error(
      'Note: All parameters are required. An admin user will be created for the tenant.',
    );
    process.exit(1);
  }

  const [tenantName, adminEmail, adminPassword] = args;

  // Basic validation
  if (!adminEmail.includes('@')) {
    console.error('❌ Invalid email format');
    process.exit(1);
  }

  if (adminPassword.length < 6) {
    console.error('❌ Password must be at least 6 characters long');
    process.exit(1);
  }

  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    const configService = app.get(ConfigService);
    const tenantService = app.get(TenantService);

    console.log(`🏢 Creating tenant: ${tenantName}`);
    console.log(`👤 Admin user: ${adminEmail}`);

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
      adminUser: {
        email: adminEmail,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
      },
    };

    console.log('\n🔄 Creating tenant...');
    const result = await tenantService.createTenant(createTenantDto);

    console.log('\n✅ Tenant created successfully!');
    console.log(`📋 Tenant ID: ${result.id}`);
    console.log(`🏢 Tenant Name: ${result.name}`);
    console.log(`📊 Status: ${result.status}`);
    console.log(`👤 Admin User: ${adminEmail}`);

    if (result.adminToken) {
      console.log(`\n🔑 Admin Access Token:`);
      console.log(`${result.adminToken}`);
      console.log('\n� Use this token for API authentication:');
      console.log(`Authorization: Bearer ${result.adminToken}`);
      console.log(`X-Tenant-ID: ${result.id}`);
    }

    console.log('\n🚀 Next steps:');
    console.log('1. Save the admin token securely');
    console.log('2. Use the token to access the tenant APIs');
    console.log('3. Create additional users via the API');
    console.log('4. Assign roles to users as needed');

    console.log('\n📋 What was created:');
    console.log('✅ Tenant database with all tables');
    console.log('✅ Default permissions (13 permissions)');
    console.log('✅ Default roles (admin, manager, user, viewer)');
    console.log('✅ Admin user with full permissions');
    console.log('✅ Ready-to-use authentication token');

    await app.close();
  } catch (error) {
    console.error('\n❌ Failed to create tenant:', error.message);
    if (error.message.includes('already exists')) {
      console.error('💡 Tip: Try a different tenant name or admin email');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  createTenant();
}
