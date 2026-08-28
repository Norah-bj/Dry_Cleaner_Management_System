# EDCMS — Database Design

Status: Phase 0 draft ERD. Field lists are illustrative of intent, not a
final migration spec — exact columns/types are finalized when each module is
implemented, against the rules in `docs/requirements/BUSINESS-RULES.md`.

## Entity list

```
users (role is a fixed enum column, not a separate roles/permissions table - see ARCHITECTURE.md)
customers, employees
services, service_prices
orders, order_items, order_status_history
payments, invoices, receipts
pickup_requests, delivery_requests
inventory_items, inventory_transactions, suppliers
order_materials
notifications
audit_logs
settings
```

## ERD

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--o{ ORDER_ITEM : contains
    ORDER ||--o{ ORDER_MATERIAL : uses
    ORDER ||--o{ ORDER_STATUS_HISTORY : logs
    ORDER ||--o{ PAYMENT : receives
    ORDER ||--o| INVOICE : generates
    ORDER ||--o| PICKUP_REQUEST : has
    ORDER ||--o| DELIVERY_REQUEST : has
    SERVICE ||--o{ SERVICE_PRICE : "priced by tier"
    SERVICE ||--o{ ORDER_ITEM : "ordered as"
    EMPLOYEE ||--o{ ORDER_STATUS_HISTORY : changes
    EMPLOYEE ||--o{ PAYMENT : receives
    EMPLOYEE ||--o{ PICKUP_REQUEST : "assigned as driver"
    EMPLOYEE ||--o{ DELIVERY_REQUEST : "assigned as driver"
    USER ||--o| EMPLOYEE : "is"
    SUPPLIER ||--o{ INVENTORY_TRANSACTION : supplies
    INVENTORY_ITEM ||--o{ INVENTORY_TRANSACTION : tracks

    USER {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string role "super_admin|manager|receptionist|cashier|laundry_staff|driver"
        boolean is_active
    }
    CUSTOMER {
        uuid id PK
        string customer_number UK
        string name
        string phone
        string alternative_phone
        string address
        decimal latitude
        decimal longitude
        string notes
        string status
    }
    ORDER {
        uuid id PK
        string order_number UK
        uuid customer_id FK
        string service_type "normal|express|same_day"
        string status "received|sorting|washing|drying|ironing|quality_check|packing|ready|delivered|picked_up"
        decimal subtotal
        decimal material_charges
        decimal discount
        decimal total
        decimal amount_paid
        decimal balance
        string payment_status
        date expected_completion
    }
    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid service_id FK
        int quantity
        decimal unit_price
        decimal line_total
    }
    ORDER_MATERIAL {
        uuid id PK
        uuid order_id FK
        string material_type "bag|cover|hanger|envelope"
        int quantity
        boolean customer_provided
        decimal charge
    }
    ORDER_STATUS_HISTORY {
        uuid id PK
        uuid order_id FK
        string status
        uuid changed_by FK
        timestamp changed_at
        string notes
    }
    PAYMENT {
        uuid id PK
        string receipt_number UK
        uuid order_id FK
        decimal amount
        string method "cash|momo|bank_transfer|card"
        string reference
        uuid received_by FK
        timestamp received_at
    }
    PICKUP_REQUEST {
        uuid id PK
        uuid order_id FK
        uuid customer_id FK
        date preferred_date
        string preferred_time_window
        uuid driver_id FK
        string status "requested|assigned|on_the_way|picked_up"
        string notes
    }
    DELIVERY_REQUEST {
        uuid id PK
        uuid order_id FK
        date preferred_date
        string preferred_time_window
        uuid driver_id FK
        string status "requested|assigned|on_the_way|delivered"
    }
    SERVICE {
        uuid id PK
        string name
    }
    SERVICE_PRICE {
        uuid id PK
        uuid service_id FK
        string tier "normal|express|same_day"
        decimal price
    }
    INVENTORY_ITEM {
        uuid id PK
        string name
        int stock_quantity
        int minimum_stock
        uuid supplier_id FK
    }
    INVENTORY_TRANSACTION {
        uuid id PK
        uuid inventory_item_id FK
        string type "purchase|usage|adjustment"
        int quantity
        timestamp created_at
    }
```

## Key design decisions

- **Order is the central entity.** Items, materials, payments, invoice,
  pickup, delivery, and status history all hang off `order_id`.
- **`service_type` is separate from `status`.** Express/same-day is a
  priority attribute on the order, never a workflow status value — see
  BUSINESS-RULES.md.
- **Status history is append-only.** `order_status_history` is a log, not a
  mutable field — every transition is a new row with `changed_by`.
- **Payments are a ledger, not a single field.** `amount_paid`/`balance` on
  `orders` are derived from summing `payments`, kept in sync by the
  application layer (or a DB trigger/computed view), never edited directly.
- **Inventory transactions are immutable.** Stock level is derived from the
  transaction ledger; a `usage` transaction that would drive quantity below
  zero must be rejected at the service layer.
- **Materials are line items**, not a boolean flag, so they can be priced
  and reported on individually (see BUSINESS-RULES.md #4).
- Foreign keys enforce referential integrity; no soft "just trust the
  frontend" relationships.
- **`role` is a fixed enum on `users`, not a roles/permissions table.** The
  six roles are set in `docs/requirements/REQUIREMENTS.md` and don't need
  dynamic management yet; revisit only if that becomes a real requirement.

## Open items

Exact column types/precision, indexes, and constraints are finalized per
module during Phase 1 implementation and recorded via TypeORM migrations —
this document is the shape, not the migration source of truth.
