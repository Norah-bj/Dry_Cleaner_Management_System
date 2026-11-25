import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4: refresh tokens (rotation + reuse detection), an audit log of
 * sensitive actions, and indexes on the busiest lookups.
 */
export class SecurityHardening1764200000000 implements MigrationInterface {
  name = 'SecurityHardening1764200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only a SHA-256 hash of each refresh token is stored. Tokens issued from
    // one login share a family_id, so reusing an old token revokes the family.
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL,
        "family_id" uuid NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "replaced_by_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_refresh_tokens_token_hash" UNIQUE ("token_hash")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_family" ON "refresh_tokens" ("family_id")`,
    );

    // Append-only record of who did what.
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_user_id" uuid,
        "actor_name" varchar,
        "action" varchar NOT NULL,
        "entity_type" varchar NOT NULL,
        "entity_id" varchar,
        "summary" varchar NOT NULL,
        "details" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_created" ON "audit_logs" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id")`,
    );

    // Hot query paths: order lists/filters, customer lookup by phone,
    // payments per order, driver job lists.
    const indexes: [string, string, string][] = [
      ['IDX_orders_created_at', 'orders', '"created_at"'],
      ['IDX_orders_status', 'orders', '"status"'],
      ['IDX_orders_payment_status', 'orders', '"payment_status"'],
      ['IDX_orders_customer', 'orders', '"customer_id"'],
      ['IDX_customers_phone', 'customers', '"phone"'],
      ['IDX_payments_order', 'payments', '"order_id"'],
      ['IDX_payments_created_at', 'payments', '"created_at"'],
      ['IDX_order_status_history_order', 'order_status_history', '"order_id"'],
      ['IDX_pickup_requests_driver', 'pickup_requests', '"assigned_driver_id"'],
      [
        'IDX_delivery_requests_driver',
        'delivery_requests',
        '"assigned_driver_id"',
      ],
    ];
    for (const [name, table, cols] of indexes) {
      await queryRunner.query(`CREATE INDEX "${name}" ON "${table}" (${cols})`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const name of [
      'IDX_orders_created_at',
      'IDX_orders_status',
      'IDX_orders_payment_status',
      'IDX_orders_customer',
      'IDX_customers_phone',
      'IDX_payments_order',
      'IDX_payments_created_at',
      'IDX_order_status_history_order',
      'IDX_pickup_requests_driver',
      'IDX_delivery_requests_driver',
    ]) {
      await queryRunner.query(`DROP INDEX "${name}"`);
    }
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
