import { Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';

/** Priority item #5. No Customers backend yet - search is a real input, disabled until wired. */
export function CustomersPage() {
  return (
    <div>
      <PageHeader
        title="Customers"
        description="Search by name or phone."
        action={
          <Button disabled title="Coming once the Customers module exists">
            + Add Customer
          </Button>
        }
      />

      <Input
        disabled
        placeholder="Search by name or phone..."
        className="mb-4 max-w-sm"
      />

      <Card>
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers registered at reception will appear here."
        />
      </Card>
    </div>
  );
}
