# EDCMS — Page-by-Page Specification

Status: confirmed direction from the product owner (2026-08-29). This is
the detailed companion to [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)'s condensed
"Page direction" section — same weight as that doc (a settled decision,
not a suggestion). DESIGN-SYSTEM.md stays the source of truth for tokens/
components/navigation; this file is the source of truth for what each
page actually contains and does.

**Guiding rule, stated by the owner directly — don't build every page at
once.** Each page below is built for real one at a time, in the sprint
order at the bottom, starting from whatever is genuinely next. Every page
not yet built keeps rendering its honest `EmptyState` shell (already in
place for all of them as of the "all nav destinations" phase) until its
turn comes.

**UX philosophy** — every page answers exactly one question, and should
feel like the dry-cleaning business first, software second:

| Page | Question it answers |
|---|---|
| Dashboard | What's happening right now? |
| Orders | What orders exist? |
| Laundry | What work needs to happen? |
| Pickup & Delivery | Where are the clothes/customers? |
| Customers | Who are our customers? |
| Payments | Who has paid? Who owes? |
| Inventory | Do we have the supplies we need? |
| Employees | Who's working, and what are they responsible for? |
| Reports | How is the business performing? |
| Settings | How does the system/business operate? |

**Don't menu-monster.** Quotations/invoices/receipts live inside Orders'
and Payments' workflows, not as their own sidebar entries. Services &
pricing, users & roles, notifications, integrations, backup, and audit
logs all live inside Settings, not as top-level nav items. The sidebar
in `docs/design/DESIGN-SYSTEM.md` is the frozen set — don't grow it just
because a feature exists somewhere in the requirements.

## Component architecture

Keep domain-specific *reusable* pieces (cards, summaries, badges reused
across more than one page) separate from the page component itself:

```
frontend/src/
  components/
    ui/           # generic primitives (Button, Card, Badge, EmptyState, ...)
    orders/        # OrderCard, OrderTimeline, ...
    customers/     # CustomerCard, ...
    payments/      # PaymentSummary, ...
    laundry/       # (laundry-specific cards, if they diverge from OrderCard)
    inventory/     # InventoryAlert, ...
  features/        # one route-level page component per domain (kept from
                    # docs/architecture/ARCHITECTURE.md's existing structure -
                    # this is the owner's "pages/" naming, same idea)
  hooks/
  services/        # API client calls per domain
  lib/
  types/
  routes/
  layouts/
```

A page should be assembled from `components/ui/*` and `components/<domain>/*`
— it shouldn't invent one-off card markup inline once a second page needs
the same shape. Extract to `components/<domain>/` the moment a second
consumer appears, not preemptively.

## RBAC permission matrix (reference for backend `@Roles()` decorators)

Illustrative starting point — confirm exact permissions per module as each
backend module is built, don't hardcode without checking against
`docs/requirements/BUSINESS-RULES.md` first:

| Area | Super Admin | Manager | Receptionist | Cashier | Laundry | Driver |
|---|---|---|---|---|---|---|
| Orders | full | full | full | view | view | assigned only |
| Payments | full | full | view | full | — | — |
| Inventory | full | full | — | — | view | — |
| Reports | full | full | — | limited | — | — |
| Employees | full | full | — | — | — | — |
| Settings | full | limited | — | — | — | — |

The frontend only *reflects* these (hide/disable UI the user's role
shouldn't see); the backend `RolesGuard`/`@Roles()` is what actually
enforces them — never trust the frontend to gate access.

---

## 1. Dashboard

*"What's happening at EBENEZER right now?"* — an operational command
center, not a report page.

- **Header:** time-of-day greeting + owner's first name (already real,
  from the auth session), "Here's what's happening at EBENEZER today,"
  today's date. Primary actions: **+ New Order** (primary), **+ Customer**
  (secondary) — New Order is always the primary action on this page.
- **A. Business overview** — four compact cards: Today's Orders, Today's
  Revenue, Ready (+ "N need pickup"), Outstanding (+ "N customers"). Keep
  them small — breathing room, not a stat wall.
- **B. Laundry flow** — one row, one count per stage (Received / Sorting /
  Washing / Drying / Ironing / QC / Packing). Each stage count is
  clickable → filters the Laundry board to that stage. This is the
  Dashboard → Laundry → Orders connection.
- **C. Needs attention** — a short list of orders that need action: ready
  for collection, overdue, unpaid, express/same-day due today, failed
  deliveries. Each row: order number, customer, item count, status,
  due. "View all orders →" link.
- **D. Today's pickups & deliveries** — two columns, each a simple
  time-sorted list (time, customer). "View pickups/deliveries →" links.
- **E. Revenue snapshot** — a small week-view bar chart. Secondary,
  smaller than the sections above — the dashboard is operations first.

## 2. Orders

Probably the single most important page in the app.

- **Header:** "Manage customer orders from intake to completion." **+ New
  Order** primary action.
- **Filters:** search (order number / customer / phone), status chips
  (All/Processing/Ready/Delivered/Unpaid), plus secondary filters for
  service type, status, and date range.
- **Table** (desktop): Order # · Customer · Items · Service · Status ·
  Payment · Due. Every row clickable → Order Details. Status uses a real
  `StatusBadge` (color + label, never color alone) — never raw text.
  Order numbers use the `EC-XXXXXX` format already used elsewhere in the
  docs (illustrative; confirm the real numbering scheme is a
  `docs/requirements/BUSINESS-RULES.md` decision, not invented here).

## 3. New Order

Speed matters more than beauty — receptionists create many of these a
day. Linear flow: **Customer → Garments → Service → Materials → Payment →
Confirmation.**

- **Customer step:** search existing customer by name/phone, or
  **+ Register New Customer** inline without leaving the flow.
- **Garments step:** add garments with quantity, price (from
  Services & Pricing, never hand-typed), and notes. Future: garment
  condition / stain / damage notes, to avoid disputes at pickup.
- Desktop: split layout with a running summary panel (per
  DESIGN-SYSTEM.md). Mobile: one step at a time, wizard-style.

## 4. Laundry

A **work queue**, visually distinct from Orders (which is information).
Kanban board, one column per stage (Received → Sorting → Washing →
Drying → Ironing → Quality Check → Packing → Ready). Each card: order
number, customer, item count, service-type badge (Express/Same Day
called out clearly, not just color), due date/time, **[ Open ]**. Staff
with permission can move a card to the next stage directly from the
card (`[ Move to Drying ]`-style action), which should write a status-
history entry (see `docs/architecture/DATABASE.md`'s `order_status_history`).

**Laundry staff get a simplified interface** — no financial reports, no
salaries, no settings, no business analytics. Just "what garments am I
processing?" This is a permissions/role concern as much as a layout one.

## 5–6. Pickup & Delivery

One page, tabs: **Pickups / Deliveries / Schedule**. Each pickup/delivery
card: time window, customer, location, driver, and the relevant action
(`Navigate` / `Contact` / `Open`).

- **Pickup statuses:** Requested → Scheduled → Driver Assigned → On the
  Way → Picked Up (or Cancelled).
- **Delivery statuses:** Scheduled → Assigned → Out for Delivery →
  Delivered (or Failed / Cancelled).
- **Delivery confirmation:** a small confirm screen when a driver
  completes a delivery — customer, order, amount, `[ Confirm Delivery ]`.
  Records driver, timestamp, status, confirmation method, notes. A
  customer-signature capture is a plausible later addition, not Phase 1.

## 7–8. Customers + Customer Profile

- **Customers list:** header + **+ New Customer**, search by name/phone/
  customer ID, then a list/table of customer cards (name, phone,
  customer number, order count, total spent, last order date).
- **Customer Profile:** header (name, customer number, phone, address,
  `[ Edit ]` `[ New Order ]`), then tabs **Overview | Orders | Payments |
  Pickup & Delivery**.
  - Overview: total orders, total spent, outstanding balance, and
    location (map link, if GPS coordinates are set).
  - Orders tab: that customer's order history.
  - Payments / Pickup & Delivery tabs: scoped history, same shape as the
    top-level pages but filtered to this customer.

## 9. Payments

*"Who has paid? Who owes?"*

- **Header:** **+ Record Payment**.
- **Today's collection summary:** total + breakdown by method (Cash/
  MoMo/Bank/Card) — only show methods actually in use, per
  `docs/requirements/BUSINESS-RULES.md`'s open question on this.
- **Payment table:** receipt #, customer, order, method, amount, date.
- **Outstanding tab:** per-customer outstanding balance list + total.

## 10. Inventory

*"Do we have the supplies we need?"* Not just a product list.

- **Header:** item count, low-stock count, out-of-stock count,
  **+ Add Item**, **+ Record Purchase**.
- **Categories:** filterable (Detergents, Softeners, Plastic Covers,
  Hangers, Perfumes, Laundry Bags, Machine Supplies, ...).
- **Table:** item, stock, minimum, supplier, status (Good/Low/Out) —
  status via color + label, never color alone.
- **Low-stock alert:** visually distinct callout, not buried in the
  table — item, remaining, minimum, `[ Restock ]`.

## 11. Employees + Employee Profile

- **List:** name, position, phone, status, role. **+ Add Employee**.
- **Profile:** name, role, phone, today's assignments (pickups/
  deliveries for drivers), and performance counters relevant to their
  role. **Salary/compensation data is permission-gated** — a driver must
  never be able to see another employee's pay, enforced server-side.

## 12. Reports

*"How is the business performing?"*

- **Header:** date-range selector, `[ Export PDF ]` `[ Export Excel ]`.
- **Overview strip:** revenue, orders, customers, outstanding — a few
  numbers, not a wall.
- **Categories:** Financial (revenue, expenses, P&L, cash flow,
  outstanding, tax summary), Operations (orders, laundry/pickup/delivery
  performance), Business (customers, employee performance, inventory
  consumption). Build the categories that map to data that actually
  exists first — don't build a P&L screen before there's a ledger to
  drive it.
- **Charts** only where they answer a real question — e.g. revenue trend,
  orders by service type. Not decoration.

## 13–17. Settings

Grouped navigation, never one long form:

```
Business        Business Information
Orders          Order Configuration, Services & Pricing
Users & Access  Users, Roles & Permissions
Notifications   SMS, WhatsApp, Email
Integrations    Google Maps, Payment Services
System          Backup, Audit Logs
```

- **Business Information:** name, phone, email, address, logo upload.
- **Services & Pricing:** the service × tier (Normal/Express/Same Day)
  price grid — this is what makes `docs/requirements/BUSINESS-RULES.md`
  §pricing real in the UI. Prices are never hardcoded in frontend code;
  they're data, editable only by authorized roles.
- **Users & Permissions:** list of users + their role; a permission
  matrix view (see the RBAC table above) so the settled RBAC design is
  visible, not just enforced invisibly.
- **Audit Logs:** a simple reverse-chronological feed — timestamp, actor,
  action, detail (e.g. "Alice recorded payment R-001245, 15,000 RWF").
  Valuable specifically because this is a real business system handling
  money — see `docs/SECURITY.md`'s audit-log requirement.

## 18. User profile area (sidebar)

Already built — `UserMenu` at the bottom of the sidebar. Keep it to
identity + Profile & Settings + Log out; business settings belong in the
Settings page, not the account menu.

## 19. Topbar

Already built — collapse toggle, global search (`orders/customers/phone
numbers`, currently a real but disabled input until a search endpoint
exists), and a notifications bell (currently disabled for the same
reason — see `CLAUDE.md`'s rule against fake functionality).

## 20. Order Details

The most detail-dense screen in the app: back link, order number, print/
more actions, customer name/phone, then the full `OrderTimeline`
(current stage highlighted), then three cards — **Garments**, **Payment**
(total/paid/balance), **Storage** (cover/bag/hanger IDs) — then an
**Order Activity** log (append-only, mirrors `order_status_history`).

## 21. Paper receipt / order slip

A dedicated print-friendly document (thermal-printer width in mind, per
DESIGN-SYSTEM.md): business name/logo, order number, customer name/
phone, itemized garments with qty/price, service tier, total/paid,
expected date & time, cover/bag IDs, and a QR code placeholder (not
required Phase 1, but leave room for it). This is what the customer
physically holds — order number, prices, expected date/time, and the
storage identifier must all be legible.

## 22. Express / Same-Day visualization

First-class, not an afterthought (client explicitly called these out).
Order cards and Order Details show the service tier as a clear badge
("EXPRESS", "SAME DAY") next to the due time — restrained styling, not
loud/neon.

## 23. Customer-facing pickup request

Simple form: name, phone, address, preferred date/time, item/bag count,
special instructions, `[ Request Pickup ]`. Lands on staff's side as a
"New pickup request" card with `[ Assign Driver ]`. This is the customer-
facing counterpart to Pickup & Delivery — build after that page's staff
side exists.

## 24. Customer mobile web

Deliberately minimal, not a shrunk desktop: brand + tagline, **Request
Pickup**, **Track Order**, **WhatsApp** click-to-chat, and service hours.
Matches DESIGN-SYSTEM.md's existing customer-mobile direction (priority
#17).

## 25. Mobile staff app (role-aware bottom nav)

Already built for the general staff shell (`Home · Orders · Jobs ·
More`). As role-specific mobile experiences get built (driver, laundry,
receptionist — DESIGN-SYSTEM.md priority #16), each gets its *own*
minimal bottom nav rather than reusing the full staff one:

```
Driver        Home | Jobs | History | Profile
Laundry       Home | Laundry | Orders | Profile
Receptionist  Home | Orders | Customers | More
```

## 26. Responsive behavior

- **Desktop:** sidebar ~255px (currently `w-64`, collapses to `w-16`),
  content takes the remaining width. Already built.
- **Tablet:** sidebar collapses to icon-only (already supported via the
  existing collapse toggle — no separate tablet-specific behavior needed
  yet).
- **Mobile:** sidebar disappears entirely, replaced by the bottom nav
  (already built). No hamburger-drawer sidebar planned — the bottom nav
  is the mobile navigation model throughout, per DESIGN-SYSTEM.md.

---

## Build order (sprints)

Matches `docs/design/DESIGN-SYSTEM.md`'s existing priority order, given
concrete sprint names. **Sprint 1–2 are done.** Sprint 3 is next.

1. **Foundation** — tokens, primitives, layout, sidebar, topbar. ✅ done.
2. **Auth + shell** — login, dashboard shell, role-aware nav, user menu. ✅ done (Dashboard is currently an honest empty-state shell, not yet wired to real data — that's part of later sprints as Orders/Payments/etc. exist to feed it).
3. **Customers** — list, search, create, edit, profile + tabs. **Next.**
4. **Orders** — list, new order, order details, status, pricing, payment state, printable slip.
5. **Laundry** — board, cards, status transitions, staff workflow.
6. **Payments** — list, record payment, partial payment, outstanding, receipt.
7. **Pickup & Delivery** — requests, driver assignment, schedule, delivery confirmation. Maps/GPS integration is explicitly Phase-1-light per `docs/requirements/REQUIREMENTS.md` (no live tracking).
8. **Inventory** — items, stock, low stock, purchases, suppliers.
9. **Employees + Reports** — employees, roles, performance, reports, exports.
10. **Settings + hardening** — business settings, services/pricing, users, permissions, notifications, audit logs, backup UI.

Each sprint is delivered as its own small, reviewable PR (or a short
sequence of them) against `main` — never build every page's real
functionality at once.
