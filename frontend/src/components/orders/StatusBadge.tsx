import type { LaundryStage } from '../../types/order';

interface StatusBadgeProps {
  stage: LaundryStage;
}

const STAGE_CONFIG: Record<LaundryStage, { label: string; bg: string; text: string; dot: string }> = {
  RECEIVED: { label: 'Received', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  SORTING: { label: 'Sorting', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  WASHING: { label: 'Washing', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  DRYING: { label: 'Drying', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  IRONING: { label: 'Ironing', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  QUALITY_CHECK: { label: 'QC Check', bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  PACKING: { label: 'Packing', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  READY: { label: 'Ready', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  DELIVERED: { label: 'Delivered', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
};

export function StatusBadge({ stage }: StatusBadgeProps) {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.RECEIVED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
