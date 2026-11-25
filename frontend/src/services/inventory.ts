import { apiFetch } from '../lib/api-client';
import type { PaginatedResult } from '../types/customer';
import type { MaterialType } from '../types/settings';

export type StockStatus = 'GOOD' | 'LOW' | 'OUT';
export type InventoryTransactionType = 'PURCHASE' | 'USAGE' | 'ADJUSTMENT';

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  stockQuantity: number;
  minimumStock: number | null;
  supplier: string | null;
  materialType: MaterialType | null;
  isActive: boolean;
  status: StockStatus;
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  item?: { name: string; unit: string };
  type: InventoryTransactionType;
  quantityChange: number;
  quantityAfter: number;
  unitCost: number | null;
  supplier: string | null;
  notes: string | null;
  orderId: string | null;
  createdAt: string;
}

export interface InventorySummary {
  items: number;
  low: number;
  out: number;
}

export function listInventoryItems(includeInactive = false): Promise<InventoryItem[]> {
  return apiFetch<InventoryItem[]>(`/inventory/items${includeInactive ? '?includeInactive=true' : ''}`);
}

export function getInventorySummary(): Promise<InventorySummary> {
  return apiFetch<InventorySummary>('/inventory/summary');
}

export interface InventoryItemInput {
  name?: string;
  category?: string | null;
  unit?: string;
  minimumStock?: number | null;
  supplier?: string | null;
  materialType?: MaterialType | null;
  isActive?: boolean;
  openingStock?: number;
}

export function createInventoryItem(input: InventoryItemInput): Promise<InventoryItem> {
  return apiFetch<InventoryItem>('/inventory/items', { method: 'POST', body: input });
}

export function updateInventoryItem(id: string, input: InventoryItemInput): Promise<InventoryItem> {
  return apiFetch<InventoryItem>(`/inventory/items/${id}`, { method: 'PATCH', body: input });
}

export type RecordTransactionInput =
  | { type: 'PURCHASE'; quantity: number; unitCost?: number; supplier?: string; notes?: string }
  | { type: 'USAGE'; quantity: number; notes?: string }
  | { type: 'ADJUSTMENT'; countedQuantity: number; notes: string };

export function recordInventoryTransaction(id: string, input: RecordTransactionInput): Promise<InventoryTransaction> {
  return apiFetch<InventoryTransaction>(`/inventory/items/${id}/transactions`, { method: 'POST', body: input });
}

export function listInventoryTransactions(
  params: { itemId?: string; type?: InventoryTransactionType; page?: number; perPage?: number } = {},
): Promise<PaginatedResult<InventoryTransaction>> {
  const q = new URLSearchParams();
  if (params.itemId) q.set('itemId', params.itemId);
  if (params.type) q.set('type', params.type);
  if (params.page) q.set('page', String(params.page));
  if (params.perPage) q.set('perPage', String(params.perPage));
  const qs = q.toString();
  return apiFetch<PaginatedResult<InventoryTransaction>>(`/inventory/transactions${qs ? `?${qs}` : ''}`);
}
