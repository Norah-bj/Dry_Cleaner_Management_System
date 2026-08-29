import { useState } from 'react';
import { Truck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { cn } from '../../lib/cn';

const TABS = ['Pickups', 'Deliveries', 'Calendar'] as const;

/** Priority item #11. Real tabs, empty state per tab - no Pickups/Deliveries backend yet. */
export function PickupDeliveryPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Pickups');

  return (
    <div>
      <PageHeader title="Pickup & Delivery" />

      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium',
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <Card>
        <EmptyState
          icon={Truck}
          title={`No ${tab.toLowerCase()} scheduled`}
          description="Requests will appear here once orders exist."
        />
      </Card>
    </div>
  );
}
