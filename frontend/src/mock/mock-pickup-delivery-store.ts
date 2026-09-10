import { INITIAL_MOCK_PICKUPS, INITIAL_MOCK_DELIVERIES, MOCK_DRIVERS } from './mock-pickup-delivery';
import type { PickupRequest, DeliveryRequest, PickupStatus, DeliveryStatus } from '../types/pickup-delivery';

const PICKUP_KEY = 'edcms_mock_pickups_v1';
const DELIVERY_KEY = 'edcms_mock_deliveries_v1';
const LISTENERS = new Set<() => void>();

function notify() {
  LISTENERS.forEach((l) => l());
}

function loadPickups(): PickupRequest[] {
  try {
    const raw = localStorage.getItem(PICKUP_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  localStorage.setItem(PICKUP_KEY, JSON.stringify(INITIAL_MOCK_PICKUPS));
  return INITIAL_MOCK_PICKUPS;
}

function savePickups(data: PickupRequest[]) {
  localStorage.setItem(PICKUP_KEY, JSON.stringify(data));
  notify();
}

function loadDeliveries(): DeliveryRequest[] {
  try {
    const raw = localStorage.getItem(DELIVERY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  localStorage.setItem(DELIVERY_KEY, JSON.stringify(INITIAL_MOCK_DELIVERIES));
  return INITIAL_MOCK_DELIVERIES;
}

function saveDeliveries(data: DeliveryRequest[]) {
  localStorage.setItem(DELIVERY_KEY, JSON.stringify(data));
  notify();
}

export const pickupDeliveryStore = {
  subscribe(listener: () => void) {
    LISTENERS.add(listener);
    return () => LISTENERS.delete(listener);
  },

  getDrivers() {
    return MOCK_DRIVERS;
  },

  // ── Pickups ─────────────────────────────────────────
  getPickups(): PickupRequest[] {
    return loadPickups();
  },

  getTodayPickups(): PickupRequest[] {
    const today = new Date().toISOString().split('T')[0];
    return loadPickups().filter((p) => p.preferredDate === today);
  },

  updatePickupStatus(id: string, status: PickupStatus, driverId?: string): PickupRequest | undefined {
    const pickups = loadPickups();
    const idx = pickups.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;

    const driver = driverId ? MOCK_DRIVERS.find((d) => d.id === driverId) : undefined;
    const updated: PickupRequest = {
      ...pickups[idx],
      status,
      driverId: driver?.id ?? pickups[idx].driverId,
      driverName: driver?.name ?? pickups[idx].driverName,
      updatedAt: new Date().toISOString(),
    };
    pickups[idx] = updated;
    savePickups(pickups);
    return updated;
  },

  createPickup(payload: Omit<PickupRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt'>): PickupRequest {
    const pickups = loadPickups();
    const seq = 1000 + pickups.length + 1;
    const now = new Date().toISOString();
    const newPickup: PickupRequest = {
      ...payload,
      id: `pu-${Date.now()}`,
      requestNumber: `PU-${String(seq).padStart(6, '0')}`,
      status: 'REQUESTED',
      createdAt: now,
      updatedAt: now,
    };
    pickups.unshift(newPickup);
    savePickups(pickups);
    return newPickup;
  },

  // ── Deliveries ──────────────────────────────────────
  getDeliveries(): DeliveryRequest[] {
    return loadDeliveries();
  },

  getTodayDeliveries(): DeliveryRequest[] {
    const today = new Date().toISOString().split('T')[0];
    return loadDeliveries().filter((d) => d.scheduledDate === today);
  },

  updateDeliveryStatus(id: string, status: DeliveryStatus, driverId?: string): DeliveryRequest | undefined {
    const deliveries = loadDeliveries();
    const idx = deliveries.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;

    const driver = driverId ? MOCK_DRIVERS.find((d) => d.id === driverId) : undefined;
    const updated: DeliveryRequest = {
      ...deliveries[idx],
      status,
      driverId: driver?.id ?? deliveries[idx].driverId,
      driverName: driver?.name ?? deliveries[idx].driverName,
      completedAt: status === 'DELIVERED' ? new Date().toISOString() : deliveries[idx].completedAt,
      updatedAt: new Date().toISOString(),
    };
    deliveries[idx] = updated;
    saveDeliveries(deliveries);
    return updated;
  },

  resetToDefaults() {
    localStorage.removeItem(PICKUP_KEY);
    localStorage.removeItem(DELIVERY_KEY);
    notify();
  },
};
