import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCheck, Minus, Package, Plus, Search, ShoppingCart } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError } from '../../components/ui/LoadError';
import { PageHeader } from '../../components/ui/PageHeader';
import { cn } from '../../lib/cn';
import { errorMessage } from '../../lib/error-message';
import { useAuth } from '../auth/use-auth';
import {
  createInventoryItem,
  listInventoryItems,
  listInventoryTransactions,
  recordInventoryTransaction,
  updateInventoryItem,
  type InventoryItem,
  type InventoryTransaction,
  type RecordTransactionInput,
  type StockStatus,
} from '../../services/inventory';
import { MATERIAL_LABELS, type MaterialType } from '../../types/settings';

const TABS = ['Items', 'Low Stock', 'History'] as const;
const STATUS_STYLES: Record<StockStatus, string> = {
  GOOD: 'bg-emerald-100 text-emerald-800',
  LOW: 'bg-amber-100 text-amber-800',
  OUT: 'bg-rose-100 text-rose-700',
};
const STATUS_LABELS: Record<StockStatus, string> = { GOOD: 'Good', LOW: 'Low', OUT: 'Out of stock' };
const TX_LABELS = { PURCHASE: 'Purchase', USAGE: 'Used', ADJUSTMENT: 'Stock count' } as const;
const MATERIALS = Object.keys(MATERIAL_LABELS) as MaterialType[];
const fieldClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none';

const qty = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const optNumber = (v: string) => (v.trim() === '' ? null : Number(v));

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <Card className="w-full max-w-md space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-text-muted">×</button>
        </div>
        {children}
      </Card>
    </div>
  );
}

// ── Add / edit item ──────────────────────────────────────────────────────────
function ItemForm({ item, items, onDone, onCancel }: { item: InventoryItem | null; items: InventoryItem[]; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? '',
    unit: item?.unit ?? 'pcs',
    minimumStock: item?.minimumStock === null || item?.minimumStock === undefined ? '' : String(item.minimumStock),
    supplier: item?.supplier ?? '',
    materialType: (item?.materialType ?? '') as MaterialType | '',
    openingStock: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const takenMaterials = new Set(items.filter((i) => i.id !== item?.id && i.materialType).map((i) => i.materialType));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      unit: form.unit.trim() || 'pcs',
      minimumStock: optNumber(form.minimumStock),
      supplier: form.supplier.trim() || null,
      materialType: form.materialType || null,
    };
    try {
      if (item) await updateInventoryItem(item.id, body);
      else await createInventoryItem({ ...body, openingStock: optNumber(form.openingStock) ?? undefined });
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'save this item'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <label className="block text-xs font-semibold">Name *<input required className={fieldClass} value={form.name} onChange={set('name')} placeholder="e.g. Plastic covers" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-semibold">Category<input className={fieldClass} value={form.category} onChange={set('category')} placeholder="e.g. Packaging" /></label>
        <label className="block text-xs font-semibold">Counted in<input required className={fieldClass} value={form.unit} onChange={set('unit')} placeholder="pcs, litres, kg" /></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-semibold">Warn me at or below<input type="number" min="0" step="0.01" className={fieldClass} value={form.minimumStock} onChange={set('minimumStock')} placeholder="no alert" /></label>
        {!item && (
          <label className="block text-xs font-semibold">In stock now<input type="number" min="0" step="0.01" className={fieldClass} value={form.openingStock} onChange={set('openingStock')} placeholder="0" /></label>
        )}
      </div>
      <label className="block text-xs font-semibold">Supplier<input className={fieldClass} value={form.supplier} onChange={set('supplier')} /></label>
      <label className="block text-xs font-semibold">Used on orders as packaging?
        <select className={fieldClass} value={form.materialType} onChange={set('materialType')}>
          <option value="">No</option>
          {MATERIALS.map((m) => (
            <option key={m} value={m} disabled={takenMaterials.has(m)}>
              Yes: {MATERIAL_LABELS[m]}{takenMaterials.has(m) ? ' (already linked)' : ''}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[11px] font-normal text-text-muted">
          If linked, every order that uses this packaging takes it out of stock automatically (not when the customer brings their own).
        </span>
      </label>
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : item ? 'Save' : 'Add item'}</Button>
      </div>
    </form>
  );
}

// ── Purchase / use / count ───────────────────────────────────────────────────
type StockAction = 'PURCHASE' | 'USAGE' | 'ADJUSTMENT';
const ACTION_TITLES: Record<StockAction, string> = { PURCHASE: 'Record purchase', USAGE: 'Record usage', ADJUSTMENT: 'Stock count' };

function StockForm({ item, action, onDone, onCancel }: { item: InventoryItem; action: StockAction; onDone: () => void; onCancel: () => void }) {
  const [amount, setAmount] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplier, setSupplier] = useState(item.supplier ?? '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const n = Number(amount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    let body: RecordTransactionInput;
    if (action === 'PURCHASE') body = { type: 'PURCHASE', quantity: n, unitCost: optNumber(unitCost) ?? undefined, supplier: supplier.trim() || undefined, notes: notes.trim() || undefined };
    else if (action === 'USAGE') body = { type: 'USAGE', quantity: n, notes: notes.trim() || undefined };
    else body = { type: 'ADJUSTMENT', countedQuantity: n, notes: notes.trim() };
    try {
      await recordInventoryTransaction(item.id, body);
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'record this'));
    } finally {
      setSaving(false);
    }
  };

  const preview =
    amount === '' || Number.isNaN(n)
      ? null
      : action === 'PURCHASE' ? item.stockQuantity + n : action === 'USAGE' ? item.stockQuantity - n : n;

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <p className="text-sm text-text-muted">In stock now: <strong className="text-text">{qty(item.stockQuantity)} {item.unit}</strong></p>
      <label className="block text-xs font-semibold">
        {action === 'ADJUSTMENT' ? `How many ${item.unit} did you count?` : `Quantity (${item.unit})`}
        <input required type="number" min={action === 'ADJUSTMENT' ? 0 : 0.01} step="0.01" className={fieldClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      {action === 'PURCHASE' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold">Price per {item.unit} (RWF)<input type="number" min="0" step="0.01" className={fieldClass} value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="optional" /></label>
          <label className="block text-xs font-semibold">Supplier<input className={fieldClass} value={supplier} onChange={(e) => setSupplier(e.target.value)} /></label>
        </div>
      )}
      <label className="block text-xs font-semibold">{action === 'ADJUSTMENT' ? 'Reason *' : 'Note'}
        <input required={action === 'ADJUSTMENT'} className={fieldClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={action === 'ADJUSTMENT' ? 'e.g. monthly count, 2 broken' : 'optional'} />
      </label>
      {preview !== null && (
        <p className={cn('rounded px-3 py-2 text-xs', preview < 0 ? 'bg-rose-50 text-rose-800' : 'bg-primary/5 text-text')}>
          {preview < 0 ? `That's more than is in stock (${qty(item.stockQuantity)} ${item.unit}).` : <>After this: <strong>{qty(preview)} {item.unit}</strong></>}
          {action === 'PURCHASE' && unitCost && n > 0 && <> · Total cost <strong>{(n * Number(unitCost)).toLocaleString()} RWF</strong></>}
        </p>
      )}
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving || (preview !== null && preview < 0)}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function InventoryPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'super_admin' || user?.role === 'manager';

  const [tab, setTab] = useState<(typeof TABS)[number]>('Items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [showHidden, setShowHidden] = useState(false);

  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null);
  const [stockAction, setStockAction] = useState<{ item: InventoryItem; action: StockAction } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, tx] = await Promise.all([listInventoryItems(showHidden), listInventoryTransactions({ perPage: 50 })]);
      setItems(list);
      setHistory(tx.data);
    } catch (err) {
      setError(errorMessage(err, 'load inventory'));
    } finally {
      setLoading(false);
    }
  }, [showHidden]);

  useEffect(() => {
    void load();
  }, [load]);

  const done = () => {
    setEditing(null);
    setStockAction(null);
    void load();
  };

  const active = items.filter((i) => i.isActive);
  const low = active.filter((i) => i.status !== 'GOOD');
  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))] as string[], [items]);
  const shown = (tab === 'Low Stock' ? low : items).filter(
    (i) =>
      (category === 'ALL' || i.category === category) &&
      (!search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.supplier ?? '').toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Do we have the supplies we need?"
        action={canManage && (
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        )}
      />

      {error && <LoadError message={error} onRetry={() => void load()} />}

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4"><div className="mb-1 text-xs text-text-muted">Items</div><div className="text-2xl font-bold text-primary">{active.length}</div></Card>
        <Card className="p-4"><div className="mb-1 text-xs text-text-muted">Low</div><div className="text-2xl font-bold text-amber-600">{active.filter((i) => i.status === 'LOW').length}</div></Card>
        <Card className="p-4"><div className="mb-1 text-xs text-text-muted">Out of stock</div><div className="text-2xl font-bold text-rose-600">{active.filter((i) => i.status === 'OUT').length}</div></Card>
      </div>

      {low.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 p-4" role="alert">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle className="h-4 w-4" /> Running low</div>
          <ul className="space-y-1.5">
            {low.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span><strong>{i.name}</strong>: {qty(i.stockQuantity)} {i.unit} left{i.minimumStock !== null && ` (warn at ${qty(i.minimumStock)})`}</span>
                {canManage && <Button size="sm" variant="secondary" onClick={() => setStockAction({ item: i, action: 'PURCHASE' })}>Restock</Button>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn('-mb-px border-b-2 px-4 py-2 text-xs font-semibold', tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text')}>
            {t}{t === 'Low Stock' && low.length > 0 ? ` (${low.length})` : ''}
          </button>
        ))}
      </div>

      {tab !== 'History' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item or supplier" className="w-full rounded-md border border-border bg-surface py-1.5 pl-8 pr-3 text-xs" />
            </div>
            {categories.length > 0 && (
              <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs">
                <option value="ALL">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {canManage && (
              <label className="flex items-center gap-1.5 text-xs text-text-muted">
                <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> Show hidden items
              </label>
            )}
          </div>

          {loading && items.length === 0 ? (
            <p className="text-sm text-text-muted">Loading inventory…</p>
          ) : shown.length === 0 && !error ? (
            <Card className="p-8">
              <EmptyState
                icon={Package}
                title={tab === 'Low Stock' ? 'Nothing is running low' : items.length === 0 ? 'No stock items yet' : 'No items match'}
                description={items.length === 0 ? (canManage ? 'Use Add Item to list your supplies (detergent, covers, hangers…) with how many you have.' : 'The owner or a manager adds stock items.') : undefined}
              />
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-border/20 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3 text-right">In stock</th>
                      <th className="px-4 py-3 text-right">Warn at</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Status</th>
                      {canManage && <th className="px-4 py-3"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shown.map((i) => (
                      <tr key={i.id} className={cn(!i.isActive && 'opacity-50')}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-text">{i.name}{!i.isActive && <span className="ml-2 text-[10px] uppercase text-text-muted">hidden</span>}</div>
                          <div className="text-[11px] text-text-muted">
                            {[i.category, i.materialType && `used on orders as ${MATERIAL_LABELS[i.materialType].toLowerCase()}`].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{qty(i.stockQuantity)} {i.unit}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-text-muted">{i.minimumStock === null ? '—' : qty(i.minimumStock)}</td>
                        <td className="px-4 py-2.5 text-text-muted">{i.supplier ?? '—'}</td>
                        <td className="px-4 py-2.5"><span className={cn('rounded px-2 py-0.5 text-[11px] font-medium', STATUS_STYLES[i.status])}>{STATUS_LABELS[i.status]}</span></td>
                        {canManage && (
                          <td className="whitespace-nowrap px-4 py-2.5 text-right">
                            <div className="inline-flex gap-1">
                              <Button size="sm" variant="ghost" aria-label={`Record purchase of ${i.name}`} title="Purchase" onClick={() => setStockAction({ item: i, action: 'PURCHASE' })}><ShoppingCart className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" aria-label={`Record usage of ${i.name}`} title="Used" onClick={() => setStockAction({ item: i, action: 'USAGE' })}><Minus className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" aria-label={`Stock count for ${i.name}`} title="Stock count" onClick={() => setStockAction({ item: i, action: 'ADJUSTMENT' })}><ClipboardCheck className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditing(i)}>Edit</Button>
                              <Button size="sm" variant="ghost" onClick={() => void updateInventoryItem(i.id, { isActive: !i.isActive }).then(load).catch((err: unknown) => setError(errorMessage(err, 'update this item')))}>
                                {i.isActive ? 'Hide' : 'Show'}
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'History' && (
        history.length === 0 ? (
          <Card className="p-8"><EmptyState icon={Package} title="No stock movements yet" description="Purchases, usage, stock counts and packaging used on orders appear here." /></Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-border/20 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">What</th>
                    <th className="px-4 py-3 text-right">Change</th>
                    <th className="px-4 py-3 text-right">After</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((t) => (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-text-muted">{new Date(t.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-2.5 font-medium">{t.item?.name ?? '—'}</td>
                      <td className="px-4 py-2.5">{TX_LABELS[t.type]}</td>
                      <td className={cn('px-4 py-2.5 text-right font-mono', t.quantityChange < 0 ? 'text-rose-700' : 'text-emerald-700')}>
                        {t.quantityChange > 0 ? '+' : ''}{qty(t.quantityChange)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{qty(t.quantityAfter)} {t.item?.unit}</td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {[t.notes, t.supplier, t.unitCost !== null && `${t.unitCost.toLocaleString()} RWF each`].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add stock item' : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <ItemForm item={editing === 'new' ? null : editing} items={items} onDone={done} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {stockAction && (
        <Modal title={`${ACTION_TITLES[stockAction.action]}: ${stockAction.item.name}`} onClose={() => setStockAction(null)}>
          <StockForm item={stockAction.item} action={stockAction.action} onDone={done} onCancel={() => setStockAction(null)} />
        </Modal>
      )}
    </div>
  );
}
