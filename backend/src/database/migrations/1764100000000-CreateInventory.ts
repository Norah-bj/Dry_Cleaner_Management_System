import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3: inventory items and an append-only stock ledger.
 *
 * `inventory_items.stock_quantity` is the current level, changed only in the
 * same database transaction that writes an `inventory_transactions` row, so
 * the two never drift. A CHECK keeps it from ever going below zero
 * (business rule #6). No items or quantities are seeded - the owner enters
 * her own.
 */
export class CreateInventory1764100000000 implements MigrationInterface {
  name = 'CreateInventory1764100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "inventory_transactions_type_enum"
        AS ENUM ('PURCHASE', 'USAGE', 'ADJUSTMENT')
    `);

    await queryRunner.query(`
      CREATE TABLE "inventory_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "category" varchar,
        "unit" varchar NOT NULL DEFAULT 'pcs',
        "stock_quantity" decimal(12,2) NOT NULL DEFAULT 0,
        "minimum_stock" decimal(12,2),
        "supplier" varchar,
        "material_type" "order_materials_material_type_enum",
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_inventory_items_name" UNIQUE ("name"),
        CONSTRAINT "UQ_inventory_items_material_type" UNIQUE ("material_type"),
        CONSTRAINT "CHK_inventory_items_stock_non_negative" CHECK ("stock_quantity" >= 0),
        CONSTRAINT "CHK_inventory_items_minimum_non_negative" CHECK (coalesce("minimum_stock", 0) >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "inventory_transactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "inventory_item_id" uuid NOT NULL
          REFERENCES "inventory_items"("id") ON DELETE RESTRICT,
        "type" "inventory_transactions_type_enum" NOT NULL,
        "quantity_change" decimal(12,2) NOT NULL,
        "quantity_after" decimal(12,2) NOT NULL,
        "unit_cost" decimal(12,2),
        "supplier" varchar,
        "notes" text,
        "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
        "created_by_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_transactions_item_created" ON "inventory_transactions" ("inventory_item_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "inventory_transactions"`);
    await queryRunner.query(`DROP TABLE "inventory_items"`);
    await queryRunner.query(`DROP TYPE "inventory_transactions_type_enum"`);
  }
}
