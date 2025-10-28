#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenantConnectionManager } from '../src/core/connection/tenant-connection.manager';

async function runTenantMigrations() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npm run migrate:tenant <tenantId>');
    console.error('Example: npm run migrate:tenant acme-corp');
    process.exit(1);
  }

  const [tenantId] = args;

  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    const tenantConnectionManager = app.get(TenantConnectionManager);

    console.log(`Running migrations for tenant: ${tenantId}`);

    const dataSource = await tenantConnectionManager.getDataSourceForTenant(tenantId);

    console.log('🔍 Checking pending migrations...');
    const pendingMigrations = await dataSource.showMigrations();

    if (pendingMigrations) {
      console.log('📦 Running migrations...');
      await dataSource.runMigrations();
      console.log('✅ Migrations completed successfully!');
    } else {
      console.log('✅ No pending migrations found.');
    }

    await app.close();
  } catch (error) {
    console.error('❌ Failed to run migrations:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTenantMigrations();
}
