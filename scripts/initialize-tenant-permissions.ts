#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenantService } from '../src/core/tenant/tenant.service';
import { TenantConnectionManager } from '../src/core/connection/tenant-connection.manager';
import { initializeTenantPermissions } from './initialize-permissions';

async function initializePermissionsForTenants() {
  const args = process.argv.slice(2);
  const specificTenantId = args[0];

  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    console.log('');
    console.log('🔑 Tenant Permissions Initializer');
    console.log('');
    console.log('Usage:');
    console.log('  npm run init:permissions [tenantId]     # Initialize permissions');
    console.log('  npm run init:all-permissions           # Initialize for all tenants');
    console.log('');
    console.log('Examples:');
    console.log('  npm run init:permissions                # Initialize for all tenants');
    console.log('  npm run init:permissions acme-corp-id  # Initialize for specific tenant');
    console.log('');
    console.log('This script will:');
    console.log('  • Create default permissions (users:*, products:*, roles:*)');
    console.log('  • Create default roles (admin, manager, user, viewer)');
    console.log('  • Assign permissions to roles');
    console.log('');
    process.exit(0);
  }

  if (args.length > 1) {
    console.error('Usage: npm run init:permissions [tenantId]');
    console.error('Use --help for more information');
    process.exit(1);
  }

  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    const tenantService = app.get(TenantService);
    const tenantConnectionManager = app.get(TenantConnectionManager);

    let tenantsToInitialize: any[] = [];

    if (specificTenantId) {
      // Initialize permissions for specific tenant
      console.log(`🔑 Initializing permissions for tenant: ${specificTenantId}`);
      const tenant = await tenantService.findTenantById(specificTenantId);
      tenantsToInitialize = [tenant];
    } else {
      // Initialize permissions for all tenants
      console.log('🔑 Initializing permissions for all tenants...');
      tenantsToInitialize = await tenantService.getAllTenants();
      console.log(`Found ${tenantsToInitialize.length} tenants`);
    }

    if (tenantsToInitialize.length === 0) {
      console.log('No tenants found to initialize.');
      await app.close();
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: { tenant: string; error: string }[] = [];

    for (let i = 0; i < tenantsToInitialize.length; i++) {
      const tenant = tenantsToInitialize[i];
      const progress = `[${i + 1}/${tenantsToInitialize.length}]`;

      try {
        console.log(`\n🔄 ${progress} Processing tenant: ${tenant.name} (${tenant.id})`);

        // Get tenant database connection
        const dataSource = await tenantConnectionManager.getDataSourceForTenant(tenant.id);

        // Initialize permissions for this tenant
        await initializeTenantPermissions(dataSource);

        console.log(`✅ Permissions initialized successfully for ${tenant.name}!`);
        successCount++;
      } catch (tenantError) {
        const errorMsg = `Failed to initialize permissions for tenant ${tenant.name} (${tenant.id}): ${tenantError.message}`;
        console.error(`❌ ${progress} ${errorMsg}`);
        errors.push({ tenant: `${tenant.name} (${tenant.id})`, error: tenantError.message });
        errorCount++;
      }
    }

    console.log(`\n📊 Initialization Summary:`);
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
      console.log(`\n⚠️  Some initializations failed. Please check the errors above.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All permissions initialized successfully!`);
      console.log(`\n📋 Default roles created:`);
      console.log(`   • admin: Full access to all resources`);
      console.log(`   • manager: User & product management, read roles`);
      console.log(`   • user: Read-only access (default for new users)`);
      console.log(`   • viewer: Read-only access to all resources`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize permissions:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  initializePermissionsForTenants();
}
