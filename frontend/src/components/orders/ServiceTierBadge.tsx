import type { ServiceTier } from '../../types/order';

interface ServiceTierBadgeProps {
  tier: ServiceTier;
}

export function ServiceTierBadge({ tier }: ServiceTierBadgeProps) {
  if (tier === 'EXPRESS') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-300">
        ⚡ EXPRESS (+50%)
      </span>
    );
  }

  if (tier === 'SAME_DAY') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 border border-rose-300">
        🔥 SAME DAY (+100%)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      Normal
    </span>
  );
}
