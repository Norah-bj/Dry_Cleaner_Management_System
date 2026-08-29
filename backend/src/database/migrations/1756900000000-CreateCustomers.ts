import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomers1756900000000 implements MigrationInterface {
  name = 'CreateCustomers1756900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TYPE "customers_status_enum" AS ENUM ('active', 'inactive')
    `);

    await queryRunner.query(`
      CREATE SEQUENCE "customer_number_seq" START WITH 1
    `);

    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_number" varchar NOT NULL,
        "name" varchar NOT NULL,
        "phone" varchar NOT NULL,
        "alternative_phone" varchar,
        "address" varchar,
        "latitude" decimal(10,7),
        "longitude" decimal(10,7),
        "notes" varchar,
        "status" "customers_status_enum" NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_customers_customer_number" UNIQUE ("customer_number")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP SEQUENCE "customer_number_seq"`);
    await queryRunner.query(`DROP TYPE "customers_status_enum"`);
  }
}
