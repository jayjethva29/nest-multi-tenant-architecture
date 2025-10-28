import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantsTable1698123456789 implements MigrationInterface {
  name = 'CreateTenantsTable1698123456789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" character varying NOT NULL,
        "name" character varying NOT NULL,
        "db_host" character varying NOT NULL,
        "db_port" integer NOT NULL,
        "db_name" character varying NOT NULL,
        "db_user" character varying NOT NULL,
        "db_password" character varying NOT NULL,
        "pool_options" jsonb,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tenants_tenant_id" UNIQUE ("tenant_id"),
        CONSTRAINT "PK_tenants_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tenants_tenant_id" ON "tenants" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tenants_active" ON "tenants" ("active")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_tenants_active"`);
    await queryRunner.query(`DROP INDEX "IDX_tenants_tenant_id"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}
