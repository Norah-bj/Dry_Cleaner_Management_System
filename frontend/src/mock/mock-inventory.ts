import type { InventoryItem, StockPurchase, Employee } from '../types/inventory';

const now = new Date();
const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

// ── Inventory items ─────────────────────────────────────────────────────────
export const INITIAL_MOCK_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1', name: 'Washing Detergent (OMO)', category: 'DETERGENTS',
    stockQty: 4, minQty: 5, unit: 'kg', unitCost: 3500, supplier: 'City Supplies Kigali',
    lastRestockedAt: d(10), createdAt: d(30), updatedAt: d(10),
  },
  {
    id: 'inv-2', name: 'Fabric Softener (Comfort)', category: 'SOFTENERS',
    stockQty: 0, minQty: 3, unit: 'litres', unitCost: 2800, supplier: 'City Supplies Kigali',
    lastRestockedAt: d(25), createdAt: d(30), updatedAt: d(25),
  },
  {
    id: 'inv-3', name: 'Plastic Covers (garment bags)', category: 'PLASTIC_COVERS',
    stockQty: 150, minQty: 100, unit: 'pcs', unitCost: 80, supplier: 'Nyamata Packaging',
    lastRestockedAt: d(5), createdAt: d(30), updatedAt: d(5),
  },
  {
    id: 'inv-4', name: 'Wire Hangers', category: 'HANGERS',
    stockQty: 30, minQty: 50, unit: 'pcs', unitCost: 150, supplier: 'Nyamata Packaging',
    lastRestockedAt: d(15), createdAt: d(30), updatedAt: d(15),
  },
  {
    id: 'inv-5', name: 'Laundry Perfume (Fresh)', category: 'PERFUMES',
    stockQty: 8, minQty: 5, unit: 'litres', unitCost: 4500, supplier: 'Rwanda Chemicals',
    lastRestockedAt: d(3), createdAt: d(30), updatedAt: d(3),
  },
  {
    id: 'inv-6', name: 'Laundry Bags (large)', category: 'LAUNDRY_BAGS',
    stockQty: 60, minQty: 40, unit: 'pcs', unitCost: 500, supplier: 'Nyamata Packaging',
    lastRestockedAt: d(8), createdAt: d(30), updatedAt: d(8),
  },
  {
    id: 'inv-7', name: 'Stain Remover', category: 'DETERGENTS',
    stockQty: 2, minQty: 4, unit: 'litres', unitCost: 5200, supplier: 'Rwanda Chemicals',
    lastRestockedAt: d(20), createdAt: d(30), updatedAt: d(20),
  },
  {
    id: 'inv-8', name: 'Ironing Spray', category: 'MACHINE_SUPPLIES',
    stockQty: 6, minQty: 3, unit: 'litres', unitCost: 2000, supplier: 'City Supplies Kigali',
    lastRestockedAt: d(12), createdAt: d(30), updatedAt: d(12),
  },
  {
    id: 'inv-9', name: 'Kraft Envelopes (small)', category: 'PACKAGING',
    stockQty: 200, minQty: 100, unit: 'pcs', unitCost: 50, supplier: 'Nyamata Packaging',
    lastRestockedAt: d(7), createdAt: d(30), updatedAt: d(7),
  },
  {
    id: 'inv-10', name: 'Machine Descaler', category: 'MACHINE_SUPPLIES',
    stockQty: 1, minQty: 2, unit: 'kg', unitCost: 8500, supplier: 'Rwanda Chemicals',
    notes: 'Use monthly for washing machines',
    lastRestockedAt: d(35), createdAt: d(60), updatedAt: d(35),
  },
];

// ── Purchase history ────────────────────────────────────────────────────────
export const INITIAL_MOCK_PURCHASES: StockPurchase[] = [
  {
    id: 'pur-1', itemId: 'inv-3', itemName: 'Plastic Covers (garment bags)',
    qtyAdded: 200, unitCost: 80, totalCost: 16000, supplier: 'Nyamata Packaging',
    purchasedBy: 'HIRWA Triphine', purchasedAt: d(5), notes: 'Monthly restock',
  },
  {
    id: 'pur-2', itemId: 'inv-5', itemName: 'Laundry Perfume (Fresh)',
    qtyAdded: 10, unitCost: 4500, totalCost: 45000, supplier: 'Rwanda Chemicals',
    purchasedBy: 'HIRWA Triphine', purchasedAt: d(3),
  },
  {
    id: 'pur-3', itemId: 'inv-1', itemName: 'Washing Detergent (OMO)',
    qtyAdded: 10, unitCost: 3500, totalCost: 35000, supplier: 'City Supplies Kigali',
    purchasedBy: 'HIRWA Triphine', purchasedAt: d(10),
  },
];

// ── Employees ───────────────────────────────────────────────────────────────
export const INITIAL_MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1', employeeNumber: 'EMP-001',
    firstName: 'HIRWA', lastName: 'Triphine',
    phone: '0788100001', email: 'triphine@ebenezer.rw',
    role: 'SUPER_ADMIN', status: 'ACTIVE',
    hireDate: '2024-01-01', createdAt: d(200), updatedAt: d(1),
  },
  {
    id: 'emp-2', employeeNumber: 'EMP-002',
    firstName: 'Alice', lastName: 'Mukamana',
    phone: '0788100002',
    role: 'RECEPTIONIST', status: 'ACTIVE',
    hireDate: '2024-03-15', createdAt: d(180), updatedAt: d(5),
  },
  {
    id: 'emp-3', employeeNumber: 'EMP-003',
    firstName: 'Jean', lastName: 'Baptiste',
    phone: '0788100003',
    role: 'LAUNDRY', status: 'ACTIVE',
    hireDate: '2024-03-15', createdAt: d(180), updatedAt: d(5),
  },
  {
    id: 'emp-4', employeeNumber: 'EMP-004',
    firstName: 'Eric', lastName: 'Niyonzima',
    phone: '0788200001',
    role: 'DRIVER', status: 'ACTIVE',
    hireDate: '2024-06-01', createdAt: d(100), updatedAt: d(2),
  },
  {
    id: 'emp-5', employeeNumber: 'EMP-005',
    firstName: 'Claire', lastName: 'Uwimana',
    phone: '0788100005',
    role: 'CASHIER', status: 'ACTIVE',
    hireDate: '2024-07-01', createdAt: d(80), updatedAt: d(1),
  },
  {
    id: 'emp-6', employeeNumber: 'EMP-006',
    firstName: 'Patrick', lastName: 'Mugisha',
    phone: '0788100006',
    role: 'DRIVER', status: 'ON_LEAVE',
    hireDate: '2024-09-01', createdAt: d(50), updatedAt: d(3),
    notes: 'On medical leave until end of month',
  },
];
