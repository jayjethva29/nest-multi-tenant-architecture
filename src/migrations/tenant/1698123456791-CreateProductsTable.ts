import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1698123456791 implements MigrationInterface {
  name = 'CreateProductsTable1698123456791';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "price" decimal(10,2) NOT NULL,
        "sku" character varying NOT NULL,
        "category" character varying,
        "stock_quantity" integer NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_products_sku" UNIQUE ("sku"),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_sku" ON "products" ("sku")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_name" ON "products" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_category" ON "products" ("category")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_active" ON "products" ("active")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_price" ON "products" ("price")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_products_price"`);
    await queryRunner.query(`DROP INDEX "IDX_products_active"`);
    await queryRunner.query(`DROP INDEX "IDX_products_category"`);
    await queryRunner.query(`DROP INDEX "IDX_products_name"`);
    await queryRunner.query(`DROP INDEX "IDX_products_sku"`);
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
