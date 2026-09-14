import { INITIAL_MOCK_INVENTORY, INITIAL_MOCK_PURCHASES, INITIAL_MOCK_EMPLOYEES } from './mock-inventory';
import type { InventoryItem, StockPurchase, Employee, InventoryCategory, StockStatus } from '../types/inventory';

const INV_KEY = 'edcms_mock_inventory_v1';
const PUR_KEY = 'edcms_mock_purchases_v1';
const EMP_KEY = 'edcms_mock_employees_v1';
const LISTENERS = new Set<() => void>();

function notify() { LISTENERS.forEach((l) => l()); }

function load<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* empty */ }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
  notify();
}

export function getStockStatus(item: InventoryItem): StockStatus {
  if (item.stockQty === 0) return 'OUT_OF_STOCK';
  if (item.stockQty < item.minQty) return 'LOW';
  return 'GOOD';
}

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  DETERGENTS: 'Detergents',
  SOFTENERS: 'Softeners',
  PLASTIC_COVERS: 'Plastic Covers',
  HANGERS: 'Hangers',
  PERFUMES: 'Perfumes',
  LAUNDRY_BAGS: 'Laundry Bags',
  MACHINE_SUPPLIES: 'Machine Supplies',
  PACKAGING: 'Packaging',
  OTHER: 'Other',
};

export const inventoryStore = {
  subscribe(listener: () => void) {
    LISTENERS.add(listener);
    return () => { LISTENERS.delete(listener); };
  },

  // ── Items ─────────────────────────────────────────
  getItems(): InventoryItem[] {
    return load(INV_KEY, INITIAL_MOCK_INVENTORY);
  },

  getLowStockItems(): InventoryItem[] {
    return this.getItems().filter((i) => getStockStatus(i) !== 'GOOD');
  },

  addItem(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): InventoryItem {
    const items = this.getItems();
    const now = new Date().toISOString();
    const newItem: InventoryItem = { ...item, id: `inv-${Date.now()}`, createdAt: now, updatedAt: now };
    items.push(newItem);
    save(INV_KEY, items);
    return newItem;
  },

  restock(itemId: string, qtyAdded: number, unitCost: number, supplier: string, purchasedBy: string): void {
    const items = load<InventoryItem>(INV_KEY, INITIAL_MOCK_INVENTORY);
    const purchases = load<StockPurchase>(PUR_KEY, INITIAL_MOCK_PURCHASES);
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx === -1) return;

    const now = new Date().toISOString();
    items[idx] = {
      ...items[idx],
      stockQty: items[idx].stockQty + qtyAdded,
      unitCost,
      supplier,
      lastRestockedAt: now,
      updatedAt: now,
    };
    purchases.unshift({
      id: `pur-${Date.now()}`,
      itemId,
      itemName: items[idx].name,
      qtyAdded,
      unitCost,
      totalCost: qtyAdded * unitCost,
      supplier,
      purchasedBy,
      purchasedAt: now,
    });
    save(INV_KEY, items);
    save(PUR_KEY, purchases);
  },

  // ── Purchases ────────────────────────────────────
  getPurchases(): StockPurchase[] {
    return load(PUR_KEY, INITIAL_MOCK_PURCHASES);
  },

  // ── Employees ────────────────────────────────────
  getEmployees(): Employee[] {
    return load(EMP_KEY, INITIAL_MOCK_EMPLOYEES);
  },

  addEmployee(emp: Omit<Employee, 'id' | 'employeeNumber' | 'createdAt' | 'updatedAt'>): Employee {
    const employees = this.getEmployees();
    const now = new Date().toISOString();
    const seq = 1 + employees.length;
    const newEmp: Employee = {
      ...emp,
      id: `emp-${Date.now()}`,
      employeeNumber: `EMP-${String(seq).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    employees.push(newEmp);
    save(EMP_KEY, employees);
    return newEmp;
  },

  updateEmployeeStatus(id: string, status: Employee['status']): void {
    const employees = this.getEmployees();
    const idx = employees.findIndex((e) => e.id === id);
    if (idx === -1) return;
    employees[idx] = { ...employees[idx], status, updatedAt: new Date().toISOString() };
    save(EMP_KEY, employees);
  },

  resetToDefaults() {
    localStorage.removeItem(INV_KEY);
    localStorage.removeItem(PUR_KEY);
    localStorage.removeItem(EMP_KEY);
    notify();
  },
};
