import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import type { Customer } from '../../types/customer';

/** Reusable customer row - used by CustomersPage's list, per docs/design/PAGES.md's components/<domain>/ convention. */
export function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Link
      to={`/customers/${customer.id}`}
      className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-primary-light/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text">{customer.name}</p>
        <p className="text-xs text-text-muted">
          {customer.phone} · {customer.customerNumber}
        </p>
      </div>
      {customer.status === 'inactive' && (
        <Badge variant="neutral">Inactive</Badge>
      )}
    </Link>
  );
}
