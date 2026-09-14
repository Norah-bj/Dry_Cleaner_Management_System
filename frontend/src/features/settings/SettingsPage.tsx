import { useState } from 'react';
import { Building2, ChevronRight, DollarSign, FileText, Bell, Shield, Database, Users } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { cn } from '../../lib/cn';

type Section =
  | 'BUSINESS'
  | 'PRICING'
  | 'USERS'
  | 'NOTIFICATIONS'
  | 'AUDIT'
  | 'SYSTEM';

const NAV_ITEMS: { id: Section; icon: React.ElementType; label: string; description: string }[] = [
  { id: 'BUSINESS', icon: Building2, label: 'Business Information', description: 'Name, contact, address, logo' },
  { id: 'PRICING', icon: DollarSign, label: 'Services & Pricing', description: 'Garment rates per service tier' },
  { id: 'USERS', icon: Users, label: 'Users & Roles', description: 'Staff accounts and permissions' },
  { id: 'NOTIFICATIONS', icon: Bell, label: 'Notifications', description: 'SMS, WhatsApp, Email settings' },
  { id: 'AUDIT', icon: FileText, label: 'Audit Logs', description: 'System activity trail' },
  { id: 'SYSTEM', icon: Database, label: 'System', description: 'Backup and integrations' },
];

// ── Business Info ─────────────────────────────────────────────────────────────
const DEFAULT_BIZ = {
  name: 'EBENEZER DRY CLEANER',
  phone: '0788 000 000',
  email: 'info@ebenezer.rw',
  address: 'Nyamata, Bugesera, Rwanda',
  owner: 'HIRWA Triphine',
};

function BusinessSection() {
  const [saved, setSaved] = useState({ ...DEFAULT_BIZ });
  const [form, setForm] = useState({ ...DEFAULT_BIZ });
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);

  function handleChange(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setDirty(true);
  }

  function handleSave() {
    setSaved({ ...form });
    setEditing(false);
    setDirty(false);
  }

  function handleCancel() {
    setForm({ ...saved });
    setEditing(false);
    setDirty(false);
  }

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: 'name', label: 'Business Name' },
    { key: 'owner', label: 'Owner Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">Business Information</h2>
        {!editing && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </div>

      <Card className="p-4 space-y-3">
        {fields.map(({ key, label }) => (
          <div key={key} className={cn('flex gap-3', editing ? 'flex-col' : 'items-center')}>
            <div className="text-xs font-medium text-text-muted w-32 shrink-0">{label}</div>
            {editing ? (
              <input
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full max-w-sm rounded border border-border bg-background px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
              />
            ) : (
              <div className="text-sm text-text">{saved[key]}</div>
            )}
          </div>
        ))}

        {editing && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={!dirty}>Save Changes</Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Pricing Grid ──────────────────────────────────────────────────────────────
const INITIAL_PRICING: { garment: string; normal: number; express: number; sameDay: number }[] = [
  { garment: 'Shirt', normal: 1000, express: 1500, sameDay: 2000 },
  { garment: 'Trousers', normal: 1500, express: 2200, sameDay: 3000 },
  { garment: 'Suit (2-pc)', normal: 4000, express: 6000, sameDay: 8000 },
  { garment: 'Dress', normal: 2000, express: 3000, sameDay: 4000 },
  { garment: 'Jacket', normal: 3000, express: 4500, sameDay: 6000 },
  { garment: 'Blanket (single)', normal: 5000, express: 7500, sameDay: 10000 },
  { garment: 'Blanket (double)', normal: 7000, express: 10500, sameDay: 14000 },
  { garment: 'Curtain (per panel)', normal: 3500, express: 5000, sameDay: 7000 },
  { garment: 'Bedsheet', normal: 2500, express: 3800, sameDay: 5000 },
];

function PricingSection() {
  const [rows, setRows] = useState(INITIAL_PRICING);
  const [editing, setEditing] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({ normal: '', express: '', sameDay: '' });

  function startEdit(idx: number) {
    setEditing(idx);
    setEditValues({
      normal: String(rows[idx].normal),
      express: String(rows[idx].express),
      sameDay: String(rows[idx].sameDay),
    });
  }

  function saveEdit(idx: number) {
    setRows((prev) => prev.map((r, i) =>
      i === idx
        ? { ...r, normal: parseInt(editValues.normal) || r.normal, express: parseInt(editValues.express) || r.express, sameDay: parseInt(editValues.sameDay) || r.sameDay }
        : r,
    ));
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">Services & Pricing</h2>
        <span className="text-xs text-text-muted">Prices in RWF · Click a row to edit</span>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-border/20 text-text-muted font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Garment</th>
                <th className="px-4 py-3 text-right">Normal</th>
                <th className="px-4 py-3 text-right">Express (+50%)</th>
                <th className="px-4 py-3 text-right">Same Day (+100%)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, idx) => (
                <tr key={row.garment} className="hover:bg-border/10">
                  <td className="px-4 py-2.5 font-medium text-text">{row.garment}</td>
                  {editing === idx ? (
                    <>
                      {(['normal', 'express', 'sameDay'] as const).map((key) => (
                        <td key={key} className="px-4 py-2">
                          <input
                            type="number"
                            value={editValues[key]}
                            onChange={(e) => setEditValues((v) => ({ ...v, [key]: e.target.value }))}
                            className="w-24 rounded border border-primary bg-background px-2 py-1 text-right text-xs text-text focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <Button size="sm" onClick={() => saveEdit(idx)}>Save</Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 text-right font-mono text-text">{row.normal.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-amber-700">{row.express.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-700">{row.sameDay.toLocaleString()}</td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => startEdit(idx)}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Stub Sections ─────────────────────────────────────────────────────────────
function ComingSoonSection({ label, description }: { label: string; description: string }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-text">{label}</h2>
      <Card className="p-6 text-center">
        <Shield className="mx-auto mb-2 h-8 w-8 text-text-muted" />
        <p className="text-sm font-medium text-text">{description}</p>
        <p className="mt-1 text-xs text-text-muted">This section will be fully interactive once the backend Settings API is implemented.</p>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const [active, setActive] = useState<Section>('BUSINESS');

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System configuration and business setup." />

      <div className="flex gap-6 lg:gap-8">
        {/* Left nav */}
        <div className="w-52 shrink-0 space-y-1">
          {NAV_ITEMS.map(({ id, icon: Icon, label, description }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                active === id
                  ? 'bg-primary/10 text-primary'
                  : 'text-text hover:bg-border/30',
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium truncate">{label}</span>
                <ChevronRight className={cn('ml-auto h-3.5 w-3.5 shrink-0 transition-transform', active === id ? 'rotate-90' : '')} />
              </div>
              <div className="mt-0.5 pl-6 text-[11px] text-text-muted truncate">{description}</div>
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {active === 'BUSINESS' && <BusinessSection />}
          {active === 'PRICING' && <PricingSection />}
          {active === 'USERS' && (
            <ComingSoonSection label="Users & Roles" description="Manage staff accounts, assign roles, and view the RBAC permission matrix." />
          )}
          {active === 'NOTIFICATIONS' && (
            <ComingSoonSection label="Notifications" description="Configure SMS, WhatsApp, and Email notification channels and templates." />
          )}
          {active === 'AUDIT' && (
            <ComingSoonSection label="Audit Logs" description="Full system activity trail — every payment, status change, and configuration update." />
          )}
          {active === 'SYSTEM' && (
            <ComingSoonSection label="System" description="Database backup, export, and third-party integrations (Google Maps, Payment Services)." />
          )}
        </div>
      </div>
    </div>
  );
}
