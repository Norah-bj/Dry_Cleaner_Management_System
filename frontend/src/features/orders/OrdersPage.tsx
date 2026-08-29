import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { cn } from '../../lib/cn';

const FILTERS = ['All', 'Processing', 'Ready', 'Delivered', 'Unpaid'] as const;

/**
 * Priority item #6 in docs/design/DESIGN-SYSTEM.md. No Orders backend
 * module yet - filters are real (client-side state), the table is a
 * real EmptyState since there's nothing to show. "New Order" is
 * disabled rather than linking to a flow that doesn't exist yet.
 */
export function OrdersPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Manage every garment currently in the business."
        action={
          <Button disabled title="Coming once the Orders module exists">
            + New Order
          </Button>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium',
              filter === f
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border text-text-muted hover:bg-border/30',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        <EmptyState
          icon={ClipboardList}
          title={`No ${filter === 'All' ? '' : filter.toLowerCase() + ' '}orders yet`}
          description="Orders created at reception will appear here, filterable by status."
        />
      </Card>
    </div>
  );
}
