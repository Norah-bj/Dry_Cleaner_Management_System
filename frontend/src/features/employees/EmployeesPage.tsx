import { useState, useEffect, useCallback } from 'react';
import { Plus, UserCog } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { inventoryStore } from '../../mock/mock-inventory-store';
import { cn } from '../../lib/cn';
import type { EmployeeRole, EmployeeStatus } from '../../types/inventory';

const ROLE_LABELS: Record<EmployeeRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  RECEPTIONIST: 'Receptionist',
  CASHIER: 'Cashier',
  LAUNDRY: 'Laundry Staff',
  DRIVER: 'Driver',
};

const ROLE_COLORS: Record<EmployeeRole, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  RECEPTIONIST: 'bg-cyan-100 text-cyan-800',
  CASHIER: 'bg-emerald-100 text-emerald-800',
  LAUNDRY: 'bg-amber-100 text-amber-800',
  DRIVER: 'bg-slate-100 text-slate-700',
};

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ON_LEAVE: 'On Leave',
};

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  INACTIVE: 'bg-slate-100 text-slate-500',
  ON_LEAVE: 'bg-amber-100 text-amber-800',
};

const ALL_ROLES: EmployeeRole[] = ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST', 'CASHIER', 'LAUNDRY', 'DRIVER'];

export function EmployeesPage() {
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | 'ALL'>('ALL');
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => { const u = inventoryStore.subscribe(refresh); return () => { u(); }; }, [refresh]);

  const employees = inventoryStore.getEmployees();

  const filtered = employees.filter((e) => roleFilter === 'ALL' || e.role === roleFilter);
  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const driverCount = employees.filter((e) => e.role === 'DRIVER').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Staff accounts, roles, and status."
        action={
          <Button onClick={() => alert('Add Employee form — coming in API phase')}>
            <Plus className="mr-1 h-4 w-4" /> Add Employee
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Total Staff</div>
          <div className="text-2xl font-bold text-primary">{employees.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Active</div>
          <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Drivers</div>
          <div className="text-2xl font-bold text-text">{driverCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">On Leave</div>
          <div className="text-2xl font-bold text-amber-600">
            {employees.filter((e) => e.status === 'ON_LEAVE').length}
          </div>
        </Card>
      </div>

      {/* Role filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRoleFilter('ALL')}
          className={cn('rounded-full border px-3 py-1 text-xs font-medium', roleFilter === 'ALL' ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-muted hover:bg-border/20')}
        >All</button>
        {ALL_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={cn('rounded-full border px-3 py-1 text-xs font-medium', roleFilter === r ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-muted hover:bg-border/20')}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Employee cards grid */}
      {filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={UserCog} title="No employees found" description="Try adjusting the role filter." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => (
            <Card key={emp.id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {emp.firstName[0]}{emp.lastName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-text truncate">
                      {emp.firstName} {emp.lastName}
                    </span>
                    <span className={cn('rounded px-2 py-0.5 text-[10px] font-medium shrink-0', STATUS_COLORS[emp.status])}>
                      {STATUS_LABELS[emp.status]}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">{emp.employeeNumber}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded px-2 py-0.5 text-xs font-medium', ROLE_COLORS[emp.role])}>
                  {ROLE_LABELS[emp.role]}
                </span>
              </div>

              <div className="text-xs text-text-muted space-y-1">
                <div>📞 <a href={`tel:${emp.phone}`} className="text-primary">{emp.phone}</a></div>
                {emp.email && <div>✉️ {emp.email}</div>}
                <div>📅 Since {new Date(emp.hireDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</div>
              </div>

              {emp.notes && (
                <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-xs text-amber-800">
                  {emp.notes}
                </div>
              )}

              {/* Status toggle */}
              <div className="flex gap-2 pt-1">
                {emp.status !== 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => { inventoryStore.updateEmployeeStatus(emp.id, 'ACTIVE'); refresh(); }}
                    className="flex-1 rounded border border-emerald-300 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    Set Active
                  </button>
                )}
                {emp.status === 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => { inventoryStore.updateEmployeeStatus(emp.id, 'ON_LEAVE'); refresh(); }}
                    className="flex-1 rounded border border-amber-300 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    Mark On Leave
                  </button>
                )}
                {emp.role === 'DRIVER' && (
                  <a
                    href={`/driver/${emp.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded border border-border py-1 text-center text-xs font-medium text-text hover:bg-border/20 transition-colors"
                  >
                    Driver View →
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
