#!/usr/bin/env ts-node

import CentralDataSource from '../src/config/central-datasource';

async function setupCentralDatabase() {
  try {
    console.log('🔄 Initializing central database connection...');

    await CentralDataSource.initialize();
    console.log('✅ Connected to central database');

    console.log('🔄 Running migrations...');
    const migrations = await CentralDataSource.runMigrations();

    if (migrations.length > 0) {
      console.log('✅ Migrations completed:');
      migrations.forEach((migration) => {
        console.log(`  - ${migration.name}`);
      });
    } else {
      console.log('ℹ️  No pending migrations found');
    }

    await CentralDataSource.destroy();
    console.log('✅ Setup completed successfully!');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupCentralDatabase();
}
