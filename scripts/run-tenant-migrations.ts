#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenantConnectionManager } from '../src/core/connection/tenant-connection.manager';
import { TenantService } from '../src/core/tenant/tenant.service';

async function runTenantMigrations() {
  const args = process.argv.slice(2);
  const specificTenantId = args[0];

  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    console.log('');
    console.log('🏢 Tenant Migration Runner');
    console.log('');
    console.log('Usage:');
    console.log('  npm run migrate:tenant [tenantId]     # Run migrations');
    console.log('  npm run migrate:all-tenants           # Run for all tenants');
    console.log('');
    console.log('Examples:');
    console.log('  npm run migrate:tenant                # Run for all tenants');
    console.log('  npm run migrate:tenant acme-corp      # Run for specific tenant');
    console.log('  npm run migrate:all-tenants           # Run for all tenants (alias)');
    console.log('');
    process.exit(0);
  }

  if (args.length > 1) {
    console.error('Usage: npm run migrate:tenant [tenantId]');
    console.error('Examples:');
    console.error('  npm run migrate:tenant           # Run for all tenants');
    console.error('  npm run migrate:tenant acme-corp # Run for specific tenant');
    console.error('Use --help for more information');
    process.exit(1);
  }

  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    const tenantConnectionManager = app.get(TenantConnectionManager);
    const tenantService = app.get(TenantService);

    let tenantsToMigrate: any[] = [];

    if (specificTenantId) {
      // Run migrations for specific tenant
      console.log(`Running migrations for specific tenant: ${specificTenantId}`);
      const tenant = await tenantService.findTenantById(specificTenantId);
      tenantsToMigrate = [tenant];
    } else {
      // Run migrations for all tenants
      console.log('Running migrations for all tenants...');
      tenantsToMigrate = await tenantService.getAllTenants();
      console.log(`Found ${tenantsToMigrate.length} tenants`);
    }

    if (tenantsToMigrate.length === 0) {
      console.log('No tenants found to migrate.');
      await app.close();
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: { tenant: string; error: string }[] = [];

    for (let i = 0; i < tenantsToMigrate.length; i++) {
      const tenant = tenantsToMigrate[i];
      const progress = `[${i + 1}/${tenantsToMigrate.length}]`;

      try {
        console.log(`\n🔄 ${progress} Processing tenant: ${tenant.name} (${tenant.id})`);

        const dataSource = await tenantConnectionManager.getDataSourceForTenant(tenant.id);

        console.log('🔍 Checking pending migrations...');
        const pendingMigrations = await dataSource.showMigrations();

        if (pendingMigrations) {
          console.log('📦 Running migrations...');
          await dataSource.runMigrations();
          console.log(`✅ Migrations completed successfully for ${tenant.name}!`);
        } else {
          console.log(`✅ No pending migrations found for ${tenant.name}.`);
        }

        successCount++;
      } catch (tenantError) {
        const errorMsg = `Failed to run migrations for tenant ${tenant.name} (${tenant.id}): ${tenantError.message}`;
        console.error(`❌ ${progress} ${errorMsg}`);
        errors.push({ tenant: `${tenant.name} (${tenant.id})`, error: tenantError.message });
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Success: ${successCount} tenant(s)`);
    console.log(`❌ Errors: ${errorCount} tenant(s)`);

    if (errors.length > 0) {
      console.log(`\n❌ Failed tenants:`);
      errors.forEach(({ tenant, error }) => {
        console.log(`   • ${tenant}: ${error}`);
      });
    }

    await app.close();

    if (errorCount > 0) {
      console.log(`\n⚠️  Some migrations failed. Please check the errors above.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All migrations completed successfully!`);
    }
  } catch (error) {
    console.error('❌ Failed to run migrations:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTenantMigrations();
}
