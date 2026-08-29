import { Wallet } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';

/** Priority item #10. No Payments backend yet. */
export function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Today's collection and outstanding balances."
      />

      <Card>
        <h2 className="mb-3 text-base font-semibold">Today&apos;s collection</h2>
        <EmptyState
          icon={Wallet}
          title="No payments recorded today"
          description="Cash, mobile money, and other payments will show up here as they're recorded."
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Outstanding balances</h2>
        <EmptyState
          icon={Wallet}
          title="No outstanding balances"
          description="Orders with an unpaid balance will be listed here."
        />
      </Card>
    </div>
  );
}
