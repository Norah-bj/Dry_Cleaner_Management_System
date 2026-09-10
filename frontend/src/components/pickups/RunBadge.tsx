import type { PickupStatus, DeliveryStatus } from '../../types/pickup-delivery';
import { cn } from '../../lib/cn';

const PICKUP_STATUS_LABELS: Record<PickupStatus, string> = {
  REQUESTED: 'Requested',
  SCHEDULED: 'Scheduled',
  DRIVER_ASSIGNED: 'Driver Assigned',
  ON_THE_WAY: 'On the Way',
  PICKED_UP: 'Picked Up',
  CANCELLED: 'Cancelled',
};

const PICKUP_STATUS_COLORS: Record<PickupStatus, string> = {
  REQUESTED: 'bg-amber-100 text-amber-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  DRIVER_ASSIGNED: 'bg-purple-100 text-purple-800',
  ON_THE_WAY: 'bg-cyan-100 text-cyan-800',
  PICKED_UP: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  SCHEDULED: 'Scheduled',
  DRIVER_ASSIGNED: 'Driver Assigned',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  DRIVER_ASSIGNED: 'bg-purple-100 text-purple-800',
  OUT_FOR_DELIVERY: 'bg-cyan-100 text-cyan-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

interface StatusBadgeProps {
  status: PickupStatus | DeliveryStatus;
  type: 'pickup' | 'delivery';
  className?: string;
}

export function RunBadge({ status, type, className }: StatusBadgeProps) {
  const label =
    type === 'pickup'
      ? PICKUP_STATUS_LABELS[status as PickupStatus]
      : DELIVERY_STATUS_LABELS[status as DeliveryStatus];
  const color =
    type === 'pickup'
      ? PICKUP_STATUS_COLORS[status as PickupStatus]
      : DELIVERY_STATUS_COLORS[status as DeliveryStatus];

  return (
    <span className={cn('rounded px-2 py-0.5 text-xs font-medium', color, className)}>
      {label}
    </span>
  );
}
