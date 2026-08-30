import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Truck, Wallet } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { ApiError } from '../../lib/api-client';
import { getCustomer, updateCustomer } from '../../services/customers';

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  alternativePhone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

const TABS = ['Overview', 'Orders', 'Payments', 'Pickup & Delivery'] as const;

/** docs/design/PAGES.md §8 - Overview tab is real data; the rest are honest empty states until Orders/Payments/Pickups backend exists. */
export function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: customer,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => getCustomer(id!),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({ resolver: zodResolver(editSchema) });

  const startEditing = () => {
    if (!customer) return;
    reset({
      name: customer.name,
      phone: customer.phone,
      alternativePhone: customer.alternativePhone ?? '',
      address: customer.address ?? '',
      notes: customer.notes ?? '',
    });
    setFormError(null);
    setEditing(true);
  };

  const onSubmit = async (values: EditFormValues) => {
    if (!id) return;
    setFormError(null);
    try {
      await updateCustomer(id, values);
      await queryClient.invalidateQueries({ queryKey: ['customers', id] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditing(false);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  if (isLoading) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  if (isError || !customer) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Customer not found"
        description="It may have been removed, or the link is wrong."
      />
    );
  }

  return (
    <div>
      <Link
        to="/customers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Customers
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{customer.name}</h1>
          <p className="text-sm text-text-muted">
            {customer.customerNumber} · {customer.phone}
          </p>
          {customer.status === 'inactive' && (
            <Badge variant="neutral" className="mt-1">
              Inactive
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={startEditing}>
            Edit
          </Button>
          <Button disabled title="Coming once the Orders module exists">
            + New Order
          </Button>
        </div>
      </div>

      {editing && (
        <Card className="mb-4 max-w-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium text-text">
                Name
              </label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-danger">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="phone" className="text-sm font-medium text-text">
                Phone
              </label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && (
                <p className="text-xs text-danger">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="alternativePhone"
                className="text-sm font-medium text-text"
              >
                Alternative phone
              </label>
              <Input id="alternativePhone" {...register('alternativePhone')} />
            </div>
            <div className="space-y-1">
              <label htmlFor="address" className="text-sm font-medium text-text">
                Address
              </label>
              <Input id="address" {...register('address')} />
            </div>
            <div className="space-y-1">
              <label htmlFor="notes" className="text-sm font-medium text-text">
                Notes
              </label>
              <Input id="notes" {...register('notes')} />
            </div>

            {formError && (
              <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save'}
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary'
                : 'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-text-muted hover:text-text'
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <p className="text-xs text-text-muted">Total Orders</p>
              <p className="text-lg font-semibold">0</p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">Total Spent</p>
              <p className="text-lg font-semibold">0 RWF</p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">Outstanding</p>
              <p className="text-lg font-semibold">0 RWF</p>
            </Card>
          </div>
          <Card>
            <h2 className="mb-3 text-base font-semibold">Contact</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Phone</dt>
                <dd>{customer.phone}</dd>
              </div>
              {customer.alternativePhone && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">Alternative phone</dt>
                  <dd>{customer.alternativePhone}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-text-muted">Address</dt>
                <dd>{customer.address ?? '—'}</dd>
              </div>
              {customer.notes && (
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-text-muted">Notes</dt>
                  <dd className="text-right">{customer.notes}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      )}

      {tab === 'Orders' && (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No orders yet"
            description="This customer's order history will appear here."
          />
        </Card>
      )}

      {tab === 'Payments' && (
        <Card>
          <EmptyState
            icon={Wallet}
            title="No payments yet"
            description="This customer's payment history will appear here."
          />
        </Card>
      )}

      {tab === 'Pickup & Delivery' && (
        <Card>
          <EmptyState
            icon={Truck}
            title="No pickup or delivery history yet"
            description="This customer's pickup and delivery requests will appear here."
          />
        </Card>
      )}
    </div>
  );
}
