import { Link } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  PackageCheck,
  Truck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
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

const LAUNDRY_STAGES = [
  'Received',
  'Sorting',
  'Washing',
  'Drying',
  'Ironing',
  'QC',
  'Packing',
];

/**
 * Priority item #4 in docs/design/DESIGN-SYSTEM.md, per the detailed spec
 * in docs/design/PAGES.md §1. There's no Orders/Payments/Pickups/
 * Deliveries backend yet, so nothing here is wired to a live summary
 * endpoint - stat values are genuinely 0 (a true fact about an empty
 * system), never a fabricated trend percentage, which would need
 * historical data we don't have. Swap for real TanStack Query-backed
 * data once the corresponding backend module exists.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.fullName.split(' ')[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}.`}
        description="Here's what's happening at EBENEZER today."
        action={
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm text-text-muted">
              {dateFormatter.format(new Date())}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled
                title="Coming once the Customers module exists"
              >
                + Customer
              </Button>
              <Button
                size="sm"
                disabled
                title="Coming once the Orders module exists"
              >
                + New Order
              </Button>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={ClipboardList} label="Today's Orders" value="0" />
        <StatCard
          icon={CircleDollarSign}
          label="Today's Revenue"
          value="0 RWF"
        />
        <StatCard
          icon={PackageCheck}
          label="Ready"
          value="0"
          hint="0 need pickup"
        />
        <StatCard
          icon={CircleDollarSign}
          label="Outstanding"
          value="0 RWF"
          hint="0 customers"
        />
      </div>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Today&apos;s laundry flow</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {LAUNDRY_STAGES.map((stage) => (
            <Link
              key={stage}
              to="/laundry"
              className="rounded-md p-2 text-center hover:bg-primary-light"
            >
              <p className="text-lg font-semibold text-text">0</p>
              <p className="text-xs text-text-muted">{stage}</p>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Needs attention</h2>
        <EmptyState
          icon={ClipboardList}
          title="Nothing needs attention"
          description="Orders that are ready for collection, overdue, unpaid, or due today (Express/Same Day) will show up here."
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
        <h2 className="mb-3 text-base font-semibold">Revenue this week</h2>
        <EmptyState
          icon={BarChart3}
          title="No revenue recorded yet"
          description="A weekly trend will appear here once payments start coming in."
        />
      </Card>
    </div>
  );
}
