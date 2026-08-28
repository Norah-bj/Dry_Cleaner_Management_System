import { CheckCircle2, ClipboardList, PackageCheck, Shirt, Truck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../auth/use-auth';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/**
 * Priority item #4 in docs/design/DESIGN-SYSTEM.md. There's no Orders/
 * Payments/Pickups/Deliveries backend yet, so this isn't wired to a live
 * summary endpoint - it renders the real page structure with honest
 * empty states rather than fabricated numbers. Swap each EmptyState for
 * a real TanStack Query-backed section once the corresponding backend
 * module exists.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.fullName.split(' ')[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="text-sm text-text-muted">
            Here&apos;s what&apos;s happening at EBENEZER today.
          </p>
        </div>
        <p className="text-sm text-text-muted">{dateFormatter.format(new Date())}</p>
      </div>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Today</h2>
        <EmptyState
          icon={ClipboardList}
          title="No activity yet today"
          description="Orders, revenue, and payments will show up here once orders start coming in."
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Ready for collection</h2>
        <EmptyState
          icon={PackageCheck}
          title="Nothing ready for collection"
          description="Orders marked Ready will appear here."
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold">Today&apos;s pickups</h2>
          <EmptyState
            icon={Truck}
            title="No pickups scheduled"
            description="Pickup requests for today will appear here."
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold">Today&apos;s deliveries</h2>
          <EmptyState
            icon={CheckCircle2}
            title="No deliveries scheduled"
            description="Deliveries for today will appear here."
          />
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Laundry flow</h2>
        <EmptyState
          icon={Shirt}
          title="No garments in process"
          description="Once orders exist, this shows a count per stage: Received, Washing, Drying, Ironing, Ready."
        />
      </Card>
    </div>
  );
}
