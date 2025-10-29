import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRolePermissionsTable1698123456794 implements MigrationInterface {
  name = 'CreateRolePermissionsTable1698123456794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "roleId" uuid NOT NULL,
        "permissionId" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("roleId", "permissionId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_permissions_roleId" ON "role_permissions" ("roleId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_permissions_permissionId" ON "role_permissions" ("permissionId")
    `);

    await queryRunner.query(`
      ALTER TABLE "role_permissions" 
      ADD CONSTRAINT "FK_role_permissions_roleId" 
      FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "role_permissions" 
      ADD CONSTRAINT "FK_role_permissions_permissionId" 
      FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_permissionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_roleId"`,
    );
    await queryRunner.query(`DROP TABLE "role_permissions"`);
  }
}
