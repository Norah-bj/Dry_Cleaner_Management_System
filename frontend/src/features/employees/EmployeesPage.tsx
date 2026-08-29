import { UserCog } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';

/** Priority item #14. No Employees backend/UI yet - this is also what npm run seed stands in for. */
export function EmployeesPage() {
  return (
    <div>
      <PageHeader
        title="Employees"
        action={
          <Button disabled title="Coming once the Employees module exists">
            + Add Employee
          </Button>
        }
      />

      <Card>
        <EmptyState
          icon={UserCog}
          title="No employees added yet"
          description="Staff accounts are currently created via the backend seed script - a proper admin screen lands here."
        />
      </Card>
    </div>
  );
}
