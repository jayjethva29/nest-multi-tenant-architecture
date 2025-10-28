import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTenantIdColumn1761212940719 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint first
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "UQ_tenants_tenant_id"`,
    );

    // Drop the index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_tenant_id"`);

    // Remove the tenant_id column
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "tenant_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add the tenant_id column back
    await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN "tenant_id" character varying`);

    // Recreate the unique constraint and index
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "UQ_tenants_tenant_id" UNIQUE ("tenant_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_tenants_tenant_id" ON "tenants" ("tenant_id")`);
  }
}
