import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { buttonVariants } from '../../components/ui/button-variants';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { CustomerCard } from '../../components/customers/CustomerCard';
import { listCustomers } from '../../services/customers';

const PER_PAGE = 20;

/** Priority item #5 / Sprint 3 in docs/design/PAGES.md - wired to the real customers API. */
export function CustomersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the search box rather than firing a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', { page, search }],
    queryFn: () => listCustomers({ page, perPage: PER_PAGE, search }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / PER_PAGE)) : 1;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Search by name or phone."
        action={
          <Link to="/customers/new" className={buttonVariants()}>
            + Add Customer
          </Link>
        }
      />

      <Input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search by name, phone, or customer number..."
        className="mb-4 max-w-sm"
      />

      <Card className="p-0">
        {isLoading && (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        )}
        {isError && (
          <p className="p-4 text-sm text-danger">
            Couldn&apos;t load customers. Try again in a moment.
          </p>
        )}
        {data && data.data.length === 0 && (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title={search ? 'No matching customers' : 'No customers yet'}
              description={
                search
                  ? 'Try a different name, phone, or customer number.'
                  : 'Customers registered at reception will appear here.'
              }
            />
          </div>
        )}
        {data &&
          data.data.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
      </Card>

      {data && data.meta.total > PER_PAGE && (
        <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
          <span>
            Page {page} of {totalPages} · {data.meta.total} customers
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
