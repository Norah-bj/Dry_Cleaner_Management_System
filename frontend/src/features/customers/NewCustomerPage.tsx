import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { buttonVariants } from '../../components/ui/button-variants';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { ApiError } from '../../lib/api-client';
import { createCustomer } from '../../services/customers';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  alternativePhone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

/** Full page, not a modal - creating a customer is a real, multi-field task, per docs/design/DESIGN-SYSTEM.md's modal-vs-page rule. */
export function NewCustomerPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({ resolver: zodResolver(customerSchema) });

  const onSubmit = async (values: CustomerFormValues) => {
    setFormError(null);
    try {
      const customer = await createCustomer(values);
      navigate(`/customers/${customer.id}`, { replace: true });
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  return (
    <div>
      <Link
        to="/customers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Customers
      </Link>

      <PageHeader title="New Customer" />

      <Card className="max-w-lg">
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
              {isSubmitting ? 'Saving…' : 'Create Customer'}
            </Button>
            <Link
              to="/customers"
              className={buttonVariants({ variant: 'ghost' })}
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
