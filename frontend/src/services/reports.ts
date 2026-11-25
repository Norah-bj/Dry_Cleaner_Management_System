import { apiDownload, apiFetch } from '../lib/api-client';

export interface ReportSummary {
  range: { from: string; to: string };
  timezone: string;
  revenue: {
    total: number;
    payments: number;
    byMethod: { method: string; total: number; count: number }[];
    byDay: { day: string; total: number }[];
  };
  orders: {
    count: number;
    value: number;
    averageValue: number;
    discounts: number;
    byTier: { tier: string; count: number; value: number }[];
    byStatus: { status: string; count: number }[];
    topItems: { item: string; quantity: number; value: number }[];
  };
  customers: { new: number; total: number };
  outstanding: { total: number; customers: number; orders: number };
  inventory: {
    purchasesCost: number;
    purchases: number;
    topUsage: { item: string; unit: string; used: number }[];
    lowStock: number;
    outOfStock: number;
  };
  logistics: {
    pickups: { status: string; count: number }[];
    deliveries: { status: string; count: number; collectable: number }[];
  };
}

export type AttentionReason = 'OVERDUE' | 'DUE_TODAY' | 'READY' | 'DELIVERY_FAILED';

export interface DashboardSummary {
  date: string;
  showsMoney: boolean;
  todayOrders: number;
  ready: number;
  readyUnpaid: number;
  todayRevenue: number | null;
  outstanding: number | null;
  owingCustomers: number | null;
  stageCounts: Record<string, number>;
  needsAttention: {
    orderId: string;
    orderNumber: string;
    customer: string;
    items: number;
    status: string;
    serviceTier: string;
    expectedCompletion: string | null;
    unpaid: boolean;
    reason: AttentionReason;
  }[];
  todayPickups: { id: string; reference: string; time_slot: string | null; status: string; customer: string }[];
  todayDeliveries: { id: string; reference: string; time_slot: string | null; status: string; customer: string }[];
  revenueLast7Days: { day: string; total: number }[] | null;
}

export type ExportDataset = 'payments' | 'orders' | 'customers' | 'inventory';

export function getReportSummary(from: string, to: string): Promise<ReportSummary> {
  return apiFetch<ReportSummary>(`/reports/summary?from=${from}&to=${to}`);
}

export function downloadReport(dataset: ExportDataset, from: string, to: string): Promise<void> {
  return apiDownload(`/reports/export/${dataset}?from=${from}&to=${to}`, `edcms-${dataset}-${from}_to_${to}.csv`);
}

export function getDashboard(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/dashboard/summary');
}
