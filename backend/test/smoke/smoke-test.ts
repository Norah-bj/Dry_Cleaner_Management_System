/**
 * Smoke test against a RUNNING EDCMS API: walks the whole order journey over
 * real HTTP and checks every response. Exits with code 1 if any step fails.
 *
 *   npm run test:smoke
 *
 * Environment (read from backend/.env, overridable on the command line):
 *   SMOKE_API_URL    base URL of the API      (default http://localhost:3000)
 *   SMOKE_EMAIL      login to use              (default ADMIN_EMAIL)
 *   SMOKE_PASSWORD   its password              (default ADMIN_PASSWORD)
 *
 * It CREATES real records (a customer named "SMOKE TEST ...", an order,
 * payments, a pickup and a delivery). Run it against dev or staging, or
 * against production only when you are happy to keep those records.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const BASE = (process.env.SMOKE_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const API = `${BASE}/api/v1`;
const EMAIL = process.env.SMOKE_EMAIL ?? process.env.ADMIN_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD ?? process.env.ADMIN_PASSWORD;

type Json = Record<string, unknown>;

let token = '';
let passed = 0;
let failed = 0;

class StepFailure extends Error {}

function check(condition: unknown, message: string): void {
  if (!condition) throw new StepFailure(message);
}

async function call(
  method: string,
  url: string,
  expectedStatus: number,
  body?: unknown,
  withAuth = true,
): Promise<Json> {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(withAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: Json = {};
  try {
    data = text ? (JSON.parse(text) as Json) : {};
  } catch {
    data = { raw: text };
  }
  check(
    res.status === expectedStatus,
    `${method} ${url} returned ${res.status}, expected ${expectedStatus}: ${text.slice(0, 300)}`,
  );
  return data;
}

async function step(name: string, fn: () => Promise<void>): Promise<void> {
  const started = Date.now();
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${name} (${Date.now() - started} ms)`);
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  FAIL  ${name}\n        ${message}`);
  }
}

async function main(): Promise<void> {
  console.log(`EDCMS smoke test against ${BASE}\n`);
  if (!EMAIL || !PASSWORD) {
    console.log(
      'Set SMOKE_EMAIL/SMOKE_PASSWORD (or ADMIN_EMAIL/ADMIN_PASSWORD).',
    );
    process.exit(1);
  }

  const stamp = Date.now().toString().slice(-6);
  let customerId = '';
  let orderId = '';
  let orderNumber = '';
  let total = 0;

  await step('API and database are up', async () => {
    const health = await call('GET', `${BASE}/health`, 200, undefined, false);
    check(health.status === 'ok', `health status is ${String(health.status)}`);
  });

  await step(
    'protected endpoints reject requests without a token',
    async () => {
      await call('GET', `${API}/orders`, 401, undefined, false);
    },
  );

  await step('staff login works', async () => {
    const login = await call(
      'POST',
      `${API}/auth/login`,
      200,
      { email: EMAIL, password: PASSWORD },
      false,
    );
    check(typeof login.accessToken === 'string', 'no accessToken in response');
    token = login.accessToken as string;
  });

  await step('register a customer', async () => {
    const customer = await call('POST', `${API}/customers`, 201, {
      name: `SMOKE TEST ${stamp}`,
      phone: `0780${stamp}`,
      address: 'Smoke test address',
    });
    customerId = customer.id as string;
    check(customerId, 'customer has no id');
  });

  await step('create an order with garments and materials', async () => {
    const order = await call('POST', `${API}/orders`, 201, {
      customerId,
      serviceTier: 'STANDARD',
      items: [{ garmentName: 'Smoke shirt', quantity: 2, unitPrice: 1000 }],
      materials: [{ materialType: 'HANGER', quantity: 2, unitCharge: 100 }],
    });
    orderId = order.id as string;
    orderNumber = order.orderNumber as string;
    total = Number(order.total);
    check(
      /^ORD-\d{4}-\d{5}$/.test(orderNumber),
      `bad order number ${orderNumber}`,
    );
    check(total === 2200, `expected total 2200, got ${total}`);
    check(order.status === 'RECEIVED', `status is ${String(order.status)}`);
  });

  await step('move the order to SORTING and log it', async () => {
    await call('PATCH', `${API}/orders/${orderId}/status`, 200, {
      status: 'SORTING',
    });
    const order = await call('GET', `${API}/orders/${orderId}`, 200);
    const history = order.statusHistory as Json[];
    check(order.status === 'SORTING', `status is ${String(order.status)}`);
    check(
      history.length === 2,
      `expected 2 history rows, got ${history.length}`,
    );
  });

  await step('order appears on the laundry board', async () => {
    const board = await call('GET', `${API}/laundry/board`, 200);
    const columns = board.columns as Record<string, Json[]>;
    check(
      columns.SORTING?.some((o) => o.id === orderId),
      'order not in SORTING column',
    );
  });

  await step('partial payment leaves a balance', async () => {
    await call('POST', `${API}/orders/${orderId}/payments`, 201, {
      amount: 1000,
      paymentMethod: 'CASH',
    });
    const order = await call('GET', `${API}/orders/${orderId}`, 200);
    check(
      Number(order.balance) === total - 1000,
      `balance is ${String(order.balance)}`,
    );
    check(
      order.paymentStatus === 'PARTIALLY_PAID',
      `payment status ${String(order.paymentStatus)}`,
    );
  });

  await step('final payment marks the order PAID', async () => {
    await call('POST', `${API}/orders/${orderId}/payments`, 201, {
      amount: total - 1000,
      paymentMethod: 'CASH',
    });
    const order = await call('GET', `${API}/orders/${orderId}`, 200);
    check(Number(order.balance) === 0, `balance is ${String(order.balance)}`);
    check(
      order.paymentStatus === 'PAID',
      `payment status ${String(order.paymentStatus)}`,
    );
  });

  await step('a fully paid order refuses more payments', async () => {
    await call('POST', `${API}/orders/${orderId}/payments`, 400, {
      amount: 100,
      paymentMethod: 'CASH',
    });
  });

  await step('customer can track the order without logging in', async () => {
    const tracked = await call(
      'GET',
      `${API}/orders/track/${orderNumber}`,
      200,
      undefined,
      false,
    );
    check(
      tracked.status === 'SORTING',
      `tracked status ${String(tracked.status)}`,
    );
  });

  await step('schedule a pickup with a time window', async () => {
    const pickup = await call('POST', `${API}/pickups`, 201, {
      customerId,
      pickupAddress: 'Smoke test address',
      scheduledDate: new Date(Date.now() + 86_400_000)
        .toISOString()
        .slice(0, 10),
      timeSlot: '14:00-16:00',
    });
    check(/^PKP-/.test(String(pickup.pickupNumber)), 'bad pickup number');
  });

  await step('customer can request a pickup from the public page', async () => {
    const res = await call(
      'POST',
      `${API}/pickups/request`,
      201,
      {
        name: `SMOKE TEST ${stamp}`,
        phone: `0780${stamp}`,
        address: 'Smoke test address',
        scheduledDate: new Date(Date.now() + 86_400_000)
          .toISOString()
          .slice(0, 10),
      },
      false,
    );
    check(/^PKP-/.test(String(res.pickupNumber)), 'bad pickup number');
    check(!('customer' in res), 'public response leaked the customer record');
  });

  await step('schedule a delivery for the order', async () => {
    const delivery = await call('POST', `${API}/deliveries`, 201, {
      orderId,
      deliveryAddress: 'Smoke test address',
      scheduledDate: new Date(Date.now() + 172_800_000)
        .toISOString()
        .slice(0, 10),
      timeSlot: '10:00-12:00',
    });
    check(/^DLV-/.test(String(delivery.deliveryNumber)), 'bad delivery number');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
