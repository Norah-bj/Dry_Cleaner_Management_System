import { Package } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';

/** Priority item #12. No Inventory backend yet. */
export function InventoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock and packaging materials."
        action={
          <Button disabled title="Coming once the Inventory module exists">
            + Record Purchase
          </Button>
        }
      />

      <Card>
        <h2 className="mb-3 text-base font-semibold">Low stock</h2>
        <EmptyState icon={Package} title="Nothing low on stock" />
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold">All items</h2>
        <EmptyState
          icon={Package}
          title="No inventory items yet"
          description="Supplies and packaging materials (bags, covers, hangers, envelopes) will be tracked here."
        />
      </Card>
    </div>
  );
}
