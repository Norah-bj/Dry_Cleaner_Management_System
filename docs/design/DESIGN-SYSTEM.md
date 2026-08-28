# EDCMS — Frontend Design Direction & Design System

Status: confirmed direction from the product owner (2026-08-26). This is the
frontend equivalent of `docs/decisions/` — a settled design decision, not a
suggestion. Don't introduce a different color palette, icon library, or
navigation structure without updating this doc and getting sign-off, same as
an architecture change.

## The concept: "The Clean Journey"

EDCMS is not a generic admin dashboard. It's a physical business — clothes
arrive messy, move through a process, become clean, get packed, and return
to the customer. The interface should visually represent that journey and
feel connected to what the business actually does:

```
RECEIVED → SORTING → WASHING → DRYING → IRONING → QUALITY CHECK → PACKING → READY → HOME
```

This progress motif is the signature design element and shows up everywhere
an order's state matters: order cards, the order detail page, the laundry
board, and the customer's order-tracking view. On a card it condenses to a
compact stepper with the current stage highlighted; on the order detail
page it's the full vertical timeline.

## Design personality

**Clean + operational + human.** The interface should read as: cleanliness,
trust, organization, speed, precision, professionalism. Explicitly **not**:
a generic blue SaaS CRUD dashboard, a wall of 15 stat cards, or anything
trying to look playful/childish. Quiet confidence, not decoration.

## Design tokens

Colors — define as CSS custom properties (not hardcoded hex in components),
so re-theming or a future dark mode is a token change, not a rewrite:

| Token | Value | Use |
|---|---|---|
| `--color-background` | `#F7F8F5` | App background (warm off-white, not pure white) |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-text` | `#17201C` | Primary text |
| `--color-text-muted` | `#6B756F` | Secondary text |
| `--color-primary` | `#1F8A70` | Primary actions, active states (emerald/teal) |
| `--color-primary-light` | `#E5F4EF` | Primary-tinted backgrounds |
| `--color-warning` | `#E9A23B` | Attention/waiting |
| `--color-danger` | `#D95C5C` | Errors/overdue/cancelled |
| `--color-border` | `#E5E9E6` | Dividers, borders |

Exact hex values can be refined; the feeling (warm, calm, not stark white,
one confident accent color) is what's frozen.

**Status color semantics** — colors carry meaning, applied consistently,
never decorative:
- Green — successful / ready / completed
- Blue — informational / active
- Yellow — waiting / needs attention
- Red — error / cancelled / overdue
- Gray — inactive

Never rely on color alone to convey status — pair with a label/icon
(accessibility).

**Typography:** one sans-serif family throughout — Inter or Plus Jakarta
Sans. Optionally a distinct face only for the EBENEZER brand wordmark, not
body UI. Scale (revised 2026-08-29 — the owner explicitly doesn't want
large text anywhere): page title 18px, section title 16px, body 13–14px,
labels 11–12px. Compact, not oversized — this is a working tool used all
day, not a marketing page. Original draft called for a larger scale
(page title 28–32px); superseded by this one.

**Icons:** one library only — Lucide. Never mix icon sets, never use emoji
as primary UI icons (emoji are fine in this doc's mockups, not in the app).

**Spacing / radius / shadows:** centralize as Tailwind theme tokens.
Subtle radius (not pill-shaped everything), subtle shadows (not heavy
elevation everywhere), generous but not wasteful whitespace.

**Breakpoints:** mobile `<640px`, tablet `640–1024px`, desktop `1024px+` —
treated as a starting point, not a rigid rule; design to content, not just
device width.

**Dark mode:** explicitly deferred, not a Phase 1 priority (this is a
light-mode-first operational/print-heavy tool). Tokens must be structured
(CSS variables, no hardcoded hex in component code) so dark mode is an
additive change later, not a rewrite.

## Navigation structure (staff, desktop sidebar)

```
OPERATIONS       Dashboard, Orders, Laundry, Pickup & Delivery
BUSINESS         Customers, Payments, Inventory, Employees
INSIGHTS         Reports
SYSTEM           Settings
```

Grouped by actual business workflow, not an alphabetical or flat list.
Sidebar uses icon + label, collapses to icon-only on smaller desktop
widths.

**Mobile bottom nav (staff):** `Home · Orders · Jobs · More` — "More"
holds Customers/Payments/Inventory/Reports/Employees/Settings.

**Driver mobile nav:** `Home · Jobs · History · Profile` — drivers see
nothing else. No dashboard, reports, inventory, employees, or settings.

**Customer mobile:** not a nav bar at all — a small set of actions
(Request Pickup, Track Order, Order via WhatsApp) per
`docs/requirements/REQUIREMENTS.md`.

## Component inventory

Design-system primitives (build these before any real page):

```
Button, Input, Select, SearchInput, Badge, StatusBadge, Card, DataTable,
Modal, Drawer, Tabs, Dropdown, Toast, Tooltip, Avatar, Pagination,
EmptyState, Skeleton, DatePicker, MoneyDisplay, OrderTimeline
```

Domain-specific components (built once the primitives exist, reused across
pages instead of each page inventing its own card):

```
OrderCard, PaymentSummary, CustomerCard, PickupCard, DeliveryCard,
InventoryAlert, GarmentItem
```

Every page is assembled from these — a page should not invent a one-off
card style. This is what keeps 15+ pages from looking like they were each
designed by a different session.

## Page direction (condensed)

- **Dashboard** — a short "good morning" header + one operational-overview
  block (today's orders/revenue/ready/pickups/deliveries/outstanding), a
  "needs attention" list (ready-for-collection), today's pickups/deliveries
  side by side, and a compact laundry-stage counter row. Not a wall of
  stat cards or generic charts.
- **Orders** — filterable table (All/Processing/Ready/Delivered/Unpaid),
  `StatusBadge` per row, not raw text status.
- **New Order** — desktop: split layout (customer search → garments →
  service type → materials, with a running summary panel). Mobile: a
  step-by-step wizard (customer → garments → service → payment → confirm).
- **Order Details** — the full `OrderTimeline` at the top ("current" stage
  highlighted), then Garments / Storage (cover/bag/hangers) / Payment
  cards, then an activity log (who changed what, when) — this is the
  accountability view.
- **Laundry** — a Kanban board by stage (Received/Washing/Drying/Ironing/…),
  each card showing order number, customer, item count, service type, and
  time-in-stage. On mobile: one stage at a time via a stage selector, not
  8 squeezed columns.
- **Pickup & Delivery** — tabs (Pickups / Deliveries / Calendar), cards not
  a raw table, each showing time window, customer, location, driver, and
  the relevant action button.
- **Customers** — searchable list with order count/last order at a glance;
  profile view shows contact info + order/spend summary + recent orders.
- **Payments** — today's collection broken down by method, recent
  payments, outstanding balances list. No unnecessary charts.
- **Inventory** — low-stock items surfaced at the top before the full
  table, not buried.
- **Reports** — date-range selector, a few key numbers, one trend view,
  one breakdown, export buttons (PDF/Excel/CSV).
- **Employees** — simple list + a profile with today's activity counts.
- **Settings** — grouped sections (Business, Orders, Pricing, Users,
  Notifications, System), not one long form.
- **Driver mobile** — today's pickups/deliveries as cards, one primary
  action each (Navigate / Picked Up / Delivered), nothing else.
- **Customer mobile** — landing with Request Pickup / Track Order / Order
  via WhatsApp; tracking view shows a simplified journey stepper and an
  expected-ready time.

## Cross-cutting UI rules

- **Forms:** grouped into labeled sections (e.g. "Customer information" /
  "Contact" / "Location"), never one long flat list of fields.
- **Modals** are for quick confirmations only (delete/cancel/confirm
  payment). Complex flows get a full page or a **drawer**, not a modal.
- **Drawers** are the pattern for "quick look without losing page context"
  (e.g. clicking an order from the dashboard).
- **Empty states** explain what will appear and offer the next action —
  never a bare "No data."
- **Loading states** use skeletons, not spinners, wherever a layout shape
  is already known.
- **Printing is part of the UX**, not an afterthought — the customer order
  slip (order number, name, phone, item count, service, due date, total/
  paid/balance) needs a dedicated print-friendly layout, thermal-printer
  width in mind. QR code is a placeholder for later, not required Phase 1.
- **Accessibility baseline:** keyboard navigation, visible focus states,
  proper labels, ~44px+ touch targets, never color-only signaling,
  screen-reader-friendly semantics.
- **Global search** (orders/customers/phone numbers) is a real feature,
  not decorative — reception relies on it.

## What to avoid

Gradients everywhere, glassmorphism, neon colors, walls of dashboard
cards, excessive rounded corners or shadows, decorative animation, emoji as
primary icons, tiny touch targets on mobile, desktop tables forced
unchanged onto phones, and pages that each look like a different app
designed them.

## Build priority order

Build in this order — each phase is small enough to be its own PR, per
`CLAUDE.md`'s Git & PR workflow:

1. Design system (project setup + tokens + primitives)
2. App shell / navigation
3. Authentication
4. Dashboard
5. Customers
6. Orders
7. New Order
8. Order Details
9. Laundry board
10. Payments
11. Pickup / Delivery
12. Inventory
13. Reports
14. Employees
15. Settings
16. Driver mobile experience
17. Customer mobile experience

Mobile and desktop are designed together at each phase — never "build
desktop, then make it responsive later."
