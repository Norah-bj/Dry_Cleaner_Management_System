import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, UserCog } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError } from '../../components/ui/LoadError';
import { PageHeader } from '../../components/ui/PageHeader';
import { cn } from '../../lib/cn';
import { errorMessage } from '../../lib/error-message';
import { useAuth } from '../auth/use-auth';
import {
  createStaff,
  listStaff,
  resetStaffPassword,
  updateStaff,
} from '../../services/settings';
import { ROLE_LABELS, type UserRole } from '../../types/auth';
import type { StaffUser } from '../../types/settings';

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  receptionist: 'bg-cyan-100 text-cyan-800',
  cashier: 'bg-emerald-100 text-emerald-800',
  laundry_staff: 'bg-amber-100 text-amber-800',
  driver: 'bg-slate-100 text-slate-700',
};

const ALL_ROLES = Object.keys(ROLE_LABELS) as UserRole[];
const fieldClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none';

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  password: string;
}

const emptyForm: FormState = { fullName: '', email: '', phone: '', role: 'receptionist', password: '' };

/** Staff logins. Each person gets their own login so every action is traceable to them. */
export function EmployeesPage() {
  const { user: me } = useAuth();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [resetFor, setResetFor] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStaff(await listStaff());
    } catch (err) {
      setError(errorMessage(err, 'load staff'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Only a Super Admin can grant or manage the Super Admin role (the API enforces this too).
  const grantableRoles = ALL_ROLES.filter((r) => r !== 'super_admin' || me?.role === 'super_admin');
  const canManage = (u: StaffUser) => u.role !== 'super_admin' || me?.role === 'super_admin';

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (u: StaffUser) => {
    setEditing(u);
    setForm({ fullName: u.fullName, email: u.email, phone: u.phone ?? '', role: u.role, password: '' });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateStaff(editing.id, {
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
        });
        setNotice(`${form.fullName} updated.`);
      } else {
        await createStaff({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          password: form.password,
        });
        setNotice(`Login created for ${form.fullName}. Give them their email and password.`);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(errorMessage(err, editing ? 'save these changes' : 'create this login'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: StaffUser) => {
    setError(null);
    try {
      await updateStaff(u.id, { isActive: !u.isActive });
      setNotice(u.isActive ? `${u.fullName} can no longer sign in.` : `${u.fullName} can sign in again.`);
      await load();
    } catch (err) {
      setError(errorMessage(err, u.isActive ? 'deactivate this login' : 'reactivate this login'));
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetFor) return;
    setSaving(true);
    setFormError(null);
    try {
      await resetStaffPassword(resetFor.id, newPassword);
      setNotice(`New password set for ${resetFor.fullName}.`);
      setResetFor(null);
      setNewPassword('');
    } catch (err) {
      setFormError(errorMessage(err, 'reset this password'));
    } finally {
      setSaving(false);
    }
  };

  const filtered = staff.filter((u) => roleFilter === 'ALL' || u.role === roleFilter);
  const active = staff.filter((u) => u.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Staff logins and roles. Everyone gets their own login so actions are traceable."
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add Employee
          </Button>
        }
      />

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800" role="status">
          {notice}
        </div>
      )}
      {error && <LoadError message={error} onRetry={() => void load()} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4"><div className="mb-1 text-xs text-text-muted">Total logins</div><div className="text-2xl font-bold text-primary">{staff.length}</div></Card>
        <Card className="p-4"><div className="mb-1 text-xs text-text-muted">Active</div><div className="text-2xl font-bold text-emerald-600">{active.length}</div></Card>
        <Card className="p-4"><div className="mb-1 text-xs text-text-muted">Drivers</div><div className="text-2xl font-bold text-text">{active.filter((u) => u.role === 'driver').length}</div></Card>
        <Card className="p-4"><div className="mb-1 text-xs text-text-muted">Deactivated</div><div className="text-2xl font-bold text-text-muted">{staff.length - active.length}</div></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['ALL', ...ALL_ROLES] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              roleFilter === r ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-muted hover:bg-border/20',
            )}
          >
            {r === 'ALL' ? 'All' : ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {loading && staff.length === 0 ? (
        <p className="text-sm text-text-muted">Loading staff…</p>
      ) : filtered.length === 0 && !error ? (
        <Card className="p-8">
          <EmptyState icon={UserCog} title="No staff in this role" description="Use Add Employee to create a login." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <Card key={u.id} className={cn('space-y-3 p-4', !u.isActive && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {u.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text">{u.fullName}</span>
                    {u.id === me?.id && <span className="text-[10px] text-text-muted">(you)</span>}
                    {!u.isActive && <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">Deactivated</span>}
                  </div>
                  <div className="truncate text-xs text-text-muted">{u.email}</div>
                </div>
              </div>
              <span className={cn('inline-block rounded px-2 py-0.5 text-xs font-medium', ROLE_COLORS[u.role])}>{ROLE_LABELS[u.role]}</span>
              {u.phone && (
                <div className="text-xs text-text-muted">
                  <a href={`tel:${u.phone}`} className="text-primary">{u.phone}</a>
                </div>
              )}
              {canManage(u) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setResetFor(u); setNewPassword(''); setFormError(null); }}>
                    <KeyRound className="h-3.5 w-3.5" /> Password
                  </Button>
                  {u.id !== me?.id && (
                    <Button size="sm" variant="ghost" onClick={() => void toggleActive(u)}>
                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={editing ? 'Edit employee' : 'Add employee'}>
          <Card className="w-full max-w-md space-y-4 p-5">
            <h2 className="text-base font-semibold">{editing ? `Edit ${editing.fullName}` : 'Add Employee'}</h2>
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
              <label className="block text-xs font-semibold">Full name
                <input required className={fieldClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold">Email (used to sign in)
                <input required type="email" disabled={!!editing} className={cn(fieldClass, editing && 'opacity-60')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold">Phone (optional)
                <input className={fieldClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold">Role
                <select
                  className={fieldClass}
                  value={form.role}
                  disabled={editing?.id === me?.id}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                >
                  {grantableRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </label>
              {!editing && (
                <label className="block text-xs font-semibold">Starting password (at least 8 characters)
                  <input required minLength={8} type="text" autoComplete="off" className={fieldClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </label>
              )}
              {formError && <p className="text-xs text-rose-700">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save' : 'Create login'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {resetFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Reset password">
          <Card className="w-full max-w-sm space-y-4 p-5">
            <h2 className="text-base font-semibold">New password for {resetFor.fullName}</h2>
            <form onSubmit={(e) => void submitReset(e)} className="space-y-3">
              <input required minLength={8} type="text" autoComplete="off" className={fieldClass} placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              {formError && <p className="text-xs text-rose-700">{formError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setResetFor(null)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Set password'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
