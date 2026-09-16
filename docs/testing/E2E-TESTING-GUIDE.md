# EDCMS — End-to-End Testing & Scenario Verification Guide

This guide provides full instructions on how to run and verify all end-to-end automated tests, scenario simulations, and manual UI verification flows across the EBENEZER Dry Cleaner Management System.

---

## 1. Automated Test Commands

### A. Backend E2E Test Suites (Jest + Supertest)
Runs full HTTP request/response cycle tests across all domain controllers, DTO validation, and route parameters:
```bash
cd backend
npm run test:e2e
```
**Expected Output:**
- `app.e2e-spec.ts`: System health & terminus checks (PASS)
- `orders-lifecycle.e2e-spec.ts`: Order creation, material calculations, 8-stage laundry progression, and public tracking (PASS)
- `payments-invoicing.e2e-spec.ts`: Partial intake deposit, full settlement, sequential receipts (`RCP-YYYY-XXXXX`), and auto-invoicing (`INV-YYYY-XXXXX`) (PASS)
- `logistics-driver.e2e-spec.ts`: Pickup intake, driver dispatch, delivery with balance collection, and driver task feed (PASS)
- **Result:** `4 passed, 4 total | 19/19 tests passed`

### B. Backend Domain Unit Tests
```bash
cd backend
npm test
```
- **Result:** `7 passed, 7 total | 27/27 tests passed`

### C. Standalone Interactive Scenario Runner
Simulates the 4 primary business workflows with rich console tables, execution latency, and step-by-step assertions:
```bash
cd backend
npm run test:scenarios
```
- **Result:** `18/18 steps passed (100%)`

### D. Frontend API Contract & Flow Verifier
```bash
cd frontend
npm run test:contracts
```
- **Result:** `4/4 frontend service contracts verified`

### E. Production Bundling & Type Checks
```bash
# Backend build
cd backend
npm run build

# Frontend build
cd frontend
npm run build
```

---

## 2. How to Run the Applications Locally for Manual Testing

### Step 1: Start the Backend Server (Port 3000)
```powershell
cd backend
npm run start:dev
```
- API Base URL: `http://localhost:3000/api/v1`
- Swagger Interactive Documentation: `http://localhost:3000/api/docs`

### Step 2: Start the Frontend Application (Port 5173)
```powershell
cd frontend
npm run dev
```
- Open in browser: `http://localhost:5173`

---

## 3. Step-by-Step Manual Verification Scenarios

### Scenario 1: Full Order Intake & Laundry Lifecycle
1. Open **New Order** (`http://localhost:5173/orders/new`).
2. Search or enter customer details:
   - Name: `Diane Uwase`
   - Phone: `0788445566`
   - Address: `Nyamata Center`
3. Add garment items:
   - `Men Suit (2-piece)` $\times 2$ (5,000 RWF each)
   - `Dress` $\times 1$ (4,000 RWF)
4. Add packaging materials:
   - `Plastic Cover` $\times 3$ (500 RWF each)
   - `Hanger` $\times 3$ (250 RWF each)
5. Under Payment, check **Record Payment Now**, select `Mobile Money (MoMo)` and enter `5,000 RWF`.
6. Click **Create Order & Print Slip**:
   - The interactive Order Intake Slip modal appears with order barcode, cover/bag codes, customer copy, and internal tags.
7. Navigate to **Laundry Processing** (`http://localhost:5173/laundry`):
   - The order appears in the `RECEIVED` column.
   - Click the advance arrow button to step through `SORTING` $\rightarrow$ `WASHING` $\rightarrow$ `DRYING` $\rightarrow$ `IRONING` $\rightarrow$ `QUALITY_CHECK` $\rightarrow$ `PACKING` $\rightarrow$ `READY`.

---

### Scenario 2: Payments, Receipts, and Tax Invoicing
1. Navigate to **Orders** (`http://localhost:5173/orders`) and select the order created above.
2. Notice the payment badge is `PARTIALLY_PAID` with the remaining balance due.
3. Click **Record Payment**:
   - Select method `Cash` and confirm the remaining balance.
   - Click **Save Payment**.
4. Order status automatically updates to `PAID` with `Balance: 0 RWF`.
5. Navigate to **Payments & Invoices** (`http://localhost:5173/payments`):
   - Both receipts (`RCP-2026-...`) are listed.
   - The revenue summary updates across Cash and MoMo categories.

---

### Scenario 3: Pickup & Delivery Logistics
1. Navigate to **Pickups & Deliveries** (`http://localhost:5173/pickups`):
   - View scheduled pickups and deliveries in the respective tabs.
2. Advance pickup status: `REQUESTED` $\rightarrow$ `SCHEDULED` $\rightarrow$ `DRIVER_ASSIGNED` $\rightarrow$ `ON_THE_WAY` $\rightarrow$ `PICKED_UP`.
3. Open the Driver Mobile View tab and click **Open Driver Mobile View** or browse directly to `http://localhost:5173/driver/drv-1`.
4. Verify the driver can view assigned tasks and complete deliveries on mobile viewports.

---

### Scenario 4: Public Customer Tracking
1. Open `http://localhost:5173/customer` on mobile or desktop viewport.
2. Enter the order number (e.g. `EC-000001` or `ORD-2026-00001`) in the tracking search box.
3. Verify the clean journey progress bar displays the active status and expected completion time.
4. Submit the "Request a Pickup" form to schedule a new home pickup.
