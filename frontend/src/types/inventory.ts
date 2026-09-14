export type InventoryCategory =
  | 'DETERGENTS'
  | 'SOFTENERS'
  | 'PLASTIC_COVERS'
  | 'HANGERS'
  | 'PERFUMES'
  | 'LAUNDRY_BAGS'
  | 'MACHINE_SUPPLIES'
  | 'PACKAGING'
  | 'OTHER';

export type StockStatus = 'GOOD' | 'LOW' | 'OUT_OF_STOCK';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  stockQty: number;
  minQty: number;      // threshold below which status becomes LOW
  unit: string;        // e.g. "litres", "pcs", "kg"
  unitCost: number;    // in RWF
  supplier?: string;
  notes?: string;
  lastRestockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockPurchase {
  id: string;
  itemId: string;
  itemName: string;
  qtyAdded: number;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  purchasedBy: string;
  purchasedAt: string;
  notes?: string;
}

export type EmployeeRole =
  | 'SUPER_ADMIN'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'CASHIER'
  | 'LAUNDRY'
  | 'DRIVER';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export interface Employee {
  id: string;
  employeeNumber: string; // e.g. EMP-001
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  hireDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
