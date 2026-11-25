import { apiFetch } from '../lib/api-client';
import type { ApiOrder } from './orders';

export interface LaundryBoardData {
  stages: string[];
  columns: Record<string, ApiOrder[]>;
  totalActive: number;
}

export function getLaundryBoard(): Promise<LaundryBoardData> {
  return apiFetch<LaundryBoardData>('/laundry/board');
}

export function getLaundryMetrics(): Promise<Record<string, number>> {
  return apiFetch<Record<string, number>>('/laundry/metrics');
}
