# EDCMS — Requirements (Phase 1)

## Business context

- **Business:** EBENEZER DRY CLEANER
- **Location:** Nyamata, Bugesera, Rwanda
- **Owner:** HIRWA Triphine
- **Problem being solved:** the business currently has no digital system for
  tracking customer orders, garments, payments, or pickup/delivery. EDCMS
  digitizes the full order lifecycle: customer registration → garment intake
  → processing → payment → pickup/delivery.

## User types

| User | Primary device | Needs |
|---|---|---|
| Staff (reception, cashier, laundry) | PC/laptop at the shop | Full order/payment/inventory workflow |
| Driver | Phone | Today's pickups/deliveries only, minimal info |
| Customer | Phone (web + WhatsApp) | Start an order, request pickup, see basic order info |
| Management | Any device, admin dashboard | Reports, oversight, configuration |

## Phase 1 scope

### Included

Authentication, user management, roles & permissions, dashboard, customer
management, employee management, services & pricing, orders, order
items/garments, laundry workflow (with express/same-day as a service type),
payments (incl. partial payments), invoices, receipts, pickup requests,
delivery requests, driver assignment, basic location info, inventory (bags,
covers, hangers, envelopes, supplies), notifications, WhatsApp order
initiation (click-to-chat), basic reports, PDF/Excel/CSV export, audit logs,
basic system settings.

### Included but pending client information

- **EBM integration** — client wants EBM on PC, but the exact
  device/software and whether it exposes an API is unknown. Build an
  isolated `ebm` module boundary; do not implement against assumptions.
  **Open question — see below.**
- **GPS / location** — store customer and pickup/delivery coordinates; no
  live driver tracking or route optimization in Phase 1.

### Explicitly excluded from Phase 1

Native Android/iOS apps, AI demand forecasting, loyalty points/coupons,
franchise/multi-tenant management, subscription billing, advanced accounting
integration, advanced BI, full WhatsApp Business API automation, complex
route optimization. Do not implement these even if they seem like natural
additions — they require a separate scoping decision.

## Functional requirements by module

- **Customers:** register with a unique customer number, phone, address,
  optional coordinates; search by number/name/phone.
- **Services & pricing:** service catalog (e.g. shirt, trouser, dress,
  jacket, blanket) with per-service pricing by priority tier (normal,
  express, same-day). Prices are configured by staff/admin, never hardcoded
  in the frontend.
- **Orders:** central entity linking a customer to order items, payments,
  invoice, pickup, delivery, materials, and status history. Order carries a
  human-readable order number used for customer verification at pickup.
- **Garment tracking:** each order records item counts by type and the
  physical materials used (bag/cover/hangers/envelope) so staff can locate
  the physical order.
- **Laundry workflow:** RECEIVED → SORTING → WASHING → DRYING → IRONING →
  QUALITY_CHECK → PACKING → READY → DELIVERED/PICKED_UP, with a status
  history log (who changed it, when, notes).
- **Payments:** cash, mobile money, bank transfer, card — only the methods
  the client actually uses should be enabled (**open question** below).
  Support full, partial, and multiple payments per order with running
  balance.
- **Pickup/Delivery:** request → assign driver → in-progress → completed,
  with a preferred date + time window (client specifically asked for pickup
  and delivery time windows). Driver sees only what's needed to do the job.
- **Inventory:** stock tracking for supplies and packaging materials, with
  purchase/usage/adjustment transactions; quantity may never go negative.
- **Notifications:** order received, order ready, payment received, pickup
  scheduled, delivery scheduled, order delivered — channels limited to what
  the client actually has available (don't over-build).
- **WhatsApp:** Phase 1A is a click-to-chat button with a pre-filled
  message; full Business API integration is a later phase.
- **Reports:** revenue, orders, payments, customers, inventory, and
  pickup/delivery performance, each exportable as PDF/Excel/CSV.
- **RBAC:** roles are SUPER_ADMIN, MANAGER, RECEPTIONIST, CASHIER,
  LAUNDRY_STAFF, DRIVER, with granular permissions (e.g. `orders.create`,
  `payments.view`, `inventory.manage`).

## Non-functional requirements

- Responsive UI usable on both a shop PC and a driver's/customer's phone.
- All monetary and business-rule values configurable by staff, not
  hardcoded.
- Every write operation is authenticated, authorized, and validated.
- Audit log for sensitive actions (status changes, payments, order
  edits/cancellations).
- The system must degrade gracefully (explicit loading/empty/error states)
  rather than fail silently.

## Open questions for the client (do not assume answers)

1. **EBM:** what EBM device/software is in use? Does it expose any
   integration point (API, file export, printer protocol)? How are receipts
   currently generated for tax purposes?
2. **Payment methods:** which of cash / mobile money / bank transfer / card
   are actually used day-to-day?
3. **Operating hours:** what are normal business hours, and do they affect
   available pickup/delivery time windows?
4. **Pricing:** actual price list per service × priority tier.
5. **Discount / cancellation / refund policy:** does one exist today, even
   informally?
6. **WhatsApp:** does the business have (or plan to get) a WhatsApp Business
   API account, or should Phase 1 stay at click-to-chat only?
7. **Service area:** is there a defined delivery radius/zone?

These must be resolved (or explicitly deferred with a documented default) in
`docs/requirements/BUSINESS-RULES.md` before the corresponding feature is
built.
