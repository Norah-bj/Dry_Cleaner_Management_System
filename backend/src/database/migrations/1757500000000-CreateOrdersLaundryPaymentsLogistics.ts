import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersLaundryPaymentsLogistics1757500000000 implements MigrationInterface {
  name = 'CreateOrdersLaundryPaymentsLogistics1757500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ENUMs
    await queryRunner.query(`
      CREATE TYPE "orders_service_tier_enum" AS ENUM ('STANDARD', 'EXPRESS', 'SAME_DAY')
    `);
    await queryRunner.query(`
      CREATE TYPE "orders_status_enum" AS ENUM (
        'RECEIVED', 'SORTING', 'WASHING', 'DRYING', 'IRONING',
        'QUALITY_CHECK', 'PACKING', 'READY', 'DELIVERED', 'CANCELLED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "orders_payment_status_enum" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID')
    `);
    await queryRunner.query(`
      CREATE TYPE "order_materials_material_type_enum" AS ENUM ('BAG', 'COVER', 'HANGER', 'ENVELOPE')
    `);
    await queryRunner.query(`
      CREATE TYPE "payments_payment_method_enum" AS ENUM ('CASH', 'MOMO', 'BANK_TRANSFER', 'CARD')
    `);
    await queryRunner.query(`
      CREATE TYPE "payments_status_enum" AS ENUM ('COMPLETED', 'PENDING', 'FAILED')
    `);
    await queryRunner.query(`
      CREATE TYPE "invoices_status_enum" AS ENUM ('ISSUED', 'PAID', 'CANCELLED')
    `);
    await queryRunner.query(`
      CREATE TYPE "pickup_requests_status_enum" AS ENUM (
        'REQUESTED', 'SCHEDULED', 'DRIVER_ASSIGNED', 'ON_THE_WAY', 'PICKED_UP', 'CANCELLED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "delivery_requests_status_enum" AS ENUM (
        'SCHEDULED', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'
      )
    `);

    // SEQUENCES for human-readable IDs
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "order_number_seq" START WITH 1`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "receipt_number_seq" START WITH 1`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "invoice_number_seq" START WITH 1`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "pickup_number_seq" START WITH 1`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "delivery_number_seq" START WITH 1`,
    );

    // 1. ORDERS TABLE
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_number" varchar NOT NULL UNIQUE,
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
        "service_tier" "orders_service_tier_enum" NOT NULL DEFAULT 'STANDARD',
        "status" "orders_status_enum" NOT NULL DEFAULT 'RECEIVED',
        "storage_hanger_id" varchar,
        "storage_box_id" varchar,
        "subtotal" decimal(12,2) NOT NULL DEFAULT 0,
        "material_charges" decimal(12,2) NOT NULL DEFAULT 0,
        "discount" decimal(12,2) NOT NULL DEFAULT 0,
        "total" decimal(12,2) NOT NULL DEFAULT 0,
        "amount_paid" decimal(12,2) NOT NULL DEFAULT 0,
        "balance" decimal(12,2) NOT NULL DEFAULT 0,
        "payment_status" "orders_payment_status_enum" NOT NULL DEFAULT 'UNPAID',
        "expected_completion" TIMESTAMP WITH TIME ZONE,
        "notes" text,
        "created_by_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // 2. ORDER ITEMS TABLE
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "garment_name" varchar NOT NULL,
        "category" varchar NOT NULL DEFAULT 'Standard',
        "quantity" integer NOT NULL DEFAULT 1,
        "unit_price" decimal(10,2) NOT NULL DEFAULT 0,
        "line_total" decimal(10,2) NOT NULL DEFAULT 0,
        "service_tier" "orders_service_tier_enum" NOT NULL DEFAULT 'STANDARD',
        "notes" text
      )
    `);

    // 3. ORDER MATERIALS TABLE
    await queryRunner.query(`
      CREATE TABLE "order_materials" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "material_type" "order_materials_material_type_enum" NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "customer_provided" boolean NOT NULL DEFAULT false,
        "unit_charge" decimal(10,2) NOT NULL DEFAULT 0,
        "total_charge" decimal(10,2) NOT NULL DEFAULT 0
      )
    `);

    // 4. ORDER STATUS HISTORY TABLE
    await queryRunner.query(`
      CREATE TABLE "order_status_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "previous_status" "orders_status_enum",
        "new_status" "orders_status_enum" NOT NULL,
        "notes" text,
        "changed_by_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // 5. PAYMENTS TABLE
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "receipt_number" varchar NOT NULL UNIQUE,
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
        "amount" decimal(12,2) NOT NULL,
        "payment_method" "payments_payment_method_enum" NOT NULL DEFAULT 'CASH',
        "status" "payments_status_enum" NOT NULL DEFAULT 'COMPLETED',
        "reference_number" varchar,
        "received_by_user_id" uuid,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // 6. INVOICES TABLE
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "invoice_number" varchar NOT NULL UNIQUE,
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "total_amount" decimal(12,2) NOT NULL,
        "status" "invoices_status_enum" NOT NULL DEFAULT 'ISSUED',
        "issued_at" TIMESTAMP NOT NULL DEFAULT now(),
        "due_at" TIMESTAMP WITH TIME ZONE
      )
    `);

    // 7. PICKUP REQUESTS TABLE
    await queryRunner.query(`
      CREATE TABLE "pickup_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "pickup_number" varchar NOT NULL UNIQUE,
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
        "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
        "pickup_address" varchar NOT NULL,
        "scheduled_date" date NOT NULL,
        "time_slot" varchar NOT NULL DEFAULT 'Morning (08:00 - 12:00)',
        "status" "pickup_requests_status_enum" NOT NULL DEFAULT 'REQUESTED',
        "assigned_driver_id" varchar,
        "assigned_driver_name" varchar,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // 8. DELIVERY REQUESTS TABLE
    await queryRunner.query(`
      CREATE TABLE "delivery_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "delivery_number" varchar NOT NULL UNIQUE,
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
        "delivery_address" varchar NOT NULL,
        "scheduled_date" date NOT NULL,
        "time_slot" varchar NOT NULL DEFAULT 'Morning (08:00 - 12:00)',
        "amount_collectable" decimal(12,2) NOT NULL DEFAULT 0,
        "status" "delivery_requests_status_enum" NOT NULL DEFAULT 'SCHEDULED',
        "assigned_driver_id" varchar,
        "assigned_driver_name" varchar,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "delivery_requests"`);
    await queryRunner.query(`DROP TABLE "pickup_requests"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "order_status_history"`);
    await queryRunner.query(`DROP TABLE "order_materials"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);

    await queryRunner.query(`DROP SEQUENCE "delivery_number_seq"`);
    await queryRunner.query(`DROP SEQUENCE "pickup_number_seq"`);
    await queryRunner.query(`DROP SEQUENCE "invoice_number_seq"`);
    await queryRunner.query(`DROP SEQUENCE "receipt_number_seq"`);
    await queryRunner.query(`DROP SEQUENCE "order_number_seq"`);

    await queryRunner.query(`DROP TYPE "delivery_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE "pickup_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE "invoices_status_enum"`);
    await queryRunner.query(`DROP TYPE "payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "payments_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "order_materials_material_type_enum"`);
    await queryRunner.query(`DROP TYPE "orders_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "orders_status_enum"`);
    await queryRunner.query(`DROP TYPE "orders_service_tier_enum"`);
  }
}
