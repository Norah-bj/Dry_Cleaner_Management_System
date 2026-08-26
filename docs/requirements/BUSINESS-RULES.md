# EDCMS — Business Rules

Rules in this file are either (a) directly stated by the client/owner, or (b)
settled schema/design decisions made during planning. Nothing here is a
guess. Anything not yet confirmed is listed under **Open questions**, not
silently decided.

Do not add a rule here without a source. If Claude (or any agent) needs a
business rule that isn't listed, it must ask rather than invent one.

## Confirmed rules

1. **Customer identity at pickup.** A customer identifies themselves by
   order number; staff verify against name/phone before releasing garments.
   This is intentionally stronger than "recognize the customer by name."
   Source: client explicitly described this verification concern.
2. **Express / Same-Day are a service priority, not a laundry status.** An
   order has a `serviceType` (normal/express/same-day) independent of its
   workflow `status` (received/washing/ready/...). Never model "EXPRESS" as
   a status value.
3. **Pickup/delivery use a preferred time window, not just a date.** Client
   phrase: "amasaha ya pickup and delivery" (pickup/delivery hours). Orders
   for pickup/delivery must capture a preferred date **and** a time window
   (e.g. 14:00–16:00), not just a date.
4. **Materials are billable order line items, not implicit costs.** Bag,
   cover, hangers, envelope each appear as a line on the customer's
   total unless the customer supplies their own, in which case the charge is
   explicitly zero (`customerProvided: true`, `charge: 0`) rather than
   omitted.
5. **Payments support partial and multiple payments per order.** An order
   tracks `total`, `amountPaid` (sum of payments), and `balance`
   (`total - amountPaid`). Payment status is derived, not stored
   independently in a way that can drift from the payments ledger.
6. **Inventory quantity may never go negative.** Stock transactions
   (purchase/usage/adjustment) must be validated against current stock
   before a usage transaction is allowed to complete.
7. **Every laundry status change is logged.** Status, changed-by, changed-at,
   and optional notes are recorded on every transition — this is the
   accountability trail the client relies on to locate an order and know who
   handled it.
8. **Drivers see only what's needed to complete their job** (customer name,
   phone, address/location, order reference, time window) — not pricing,
   payment status, or other customers' data.
9. **Customer number is unique** and is the primary reference printed on the
   customer's paper/receipt, alongside name, phone, item count, expected
   date, total, paid, and balance.

## Open questions (not yet rules — do not implement as if decided)

These map to the open questions in `docs/requirements/REQUIREMENTS.md`:

- Exact price list per service × priority tier.
- Which payment methods are actually active (cash/MoMo/bank/card).
- Discount, cancellation, and refund policy.
- Business operating hours (constrains valid pickup/delivery windows).
- Service/delivery area boundary, if any.
- EBM receipt requirements — whether/how EDCMS must produce
  EBM-compliant receipts.

When one of these is answered by the client, move it into **Confirmed
rules** above with a note on the source and date, and update
`docs/CHANGELOG.md`.
