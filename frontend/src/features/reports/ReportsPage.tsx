import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { cn } from '../../lib/cn';

const RANGES = ['Today', '7 Days', '30 Days'] as const;

/** Priority item #13. Range selector is real, no report data source yet. */
export function ReportsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('Today');

  return (
    <div>
      <PageHeader title="Reports" />

      <div className="mb-4 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              range === r
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border text-text-muted hover:bg-border/30',
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <Card>
        <EmptyState
          icon={BarChart3}
          title="No report data yet"
          description="Revenue, orders, payments, and inventory breakdowns will appear here once the business is operating in the system."
        />
      </Card>
    </div>
  );
}
