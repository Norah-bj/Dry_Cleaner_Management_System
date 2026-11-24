import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2: owner-configurable business settings, the service price list,
 * staff phone numbers, and the link from order lines to the price list.
 *
 * Nothing here invents a business number. The settings row starts with
 * only the facts already in docs/requirements (business name, owner,
 * location); prices, payment methods, hours and time windows start empty
 * and are entered by the owner in Settings.
 */
export class SettingsCatalogStaff1764000000000 implements MigrationInterface {
  name = 'SettingsCatalogStaff1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "phone" varchar`);

    await queryRunner.query(`
      CREATE TABLE "service_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "category" varchar,
        "price_standard" decimal(10,2),
        "price_express" decimal(10,2),
        "price_same_day" decimal(10,2),
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_service_items_name" UNIQUE ("name"),
        CONSTRAINT "CHK_service_items_prices_non_negative" CHECK (
          coalesce("price_standard", 0) >= 0
          AND coalesce("price_express", 0) >= 0
          AND coalesce("price_same_day", 0) >= 0
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "business_settings" (
        "id" integer PRIMARY KEY DEFAULT 1,
        "business_name" varchar NOT NULL,
        "owner_name" varchar,
        "phone" varchar,
        "whatsapp_number" varchar,
        "email" varchar,
        "address" varchar,
        "tin" varchar,
        "opening_hours" jsonb NOT NULL DEFAULT '[]',
        "time_slots" jsonb NOT NULL DEFAULT '[]',
        "enabled_payment_methods" jsonb NOT NULL DEFAULT '[]',
        "material_charges" jsonb NOT NULL DEFAULT '{}',
        "turnaround" jsonb NOT NULL DEFAULT '{}',
        "allow_discounts" boolean NOT NULL DEFAULT false,
        "discount_roles" jsonb NOT NULL DEFAULT '[]',
        "receipt_footer" varchar,
        "updated_by_user_id" uuid,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_business_settings_single_row" CHECK ("id" = 1)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "business_settings" ("id", "business_name", "owner_name", "address")
      VALUES (1, 'EBENEZER DRY CLEANER', 'HIRWA Triphine', 'Nyamata, Bugesera, Rwanda')
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items"
        ADD "service_item_id" uuid,
        ADD CONSTRAINT "FK_order_items_service_item"
          FOREIGN KEY ("service_item_id") REFERENCES "service_items"("id")
          ON DELETE SET NULL
    `);

    // The old 'Morning (08:00 - 12:00)' default was never confirmed by the
    // client. Time windows now come from Settings.
    for (const table of ['pickup_requests', 'delivery_requests']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "time_slot" DROP DEFAULT`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "time_slot" DROP NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['pickup_requests', 'delivery_requests']) {
      await queryRunner.query(
        `UPDATE "${table}" SET "time_slot" = '' WHERE "time_slot" IS NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "time_slot" SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "time_slot" SET DEFAULT 'Morning (08:00 - 12:00)'`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_service_item"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "service_item_id"`,
    );
    await queryRunner.query(`DROP TABLE "business_settings"`);
    await queryRunner.query(`DROP TABLE "service_items"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
  }
}
