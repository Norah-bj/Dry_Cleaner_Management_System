import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Package, Plus, Search, ShoppingCart, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { inventoryStore, getStockStatus, CATEGORY_LABELS } from '../../mock/mock-inventory-store';
import { cn } from '../../lib/cn';
import type { InventoryCategory, InventoryItem } from '../../types/inventory';

const TABS = ['All Items', 'Low Stock', 'Purchases'] as const;
const ALL_CATS: InventoryCategory[] = [
  'DETERGENTS', 'SOFTENERS', 'PLASTIC_COVERS', 'HANGERS',
  'PERFUMES', 'LAUNDRY_BAGS', 'MACHINE_SUPPLIES', 'PACKAGING', 'OTHER',
];

const STATUS_STYLES = {
  GOOD: 'bg-emerald-100 text-emerald-800',
  LOW: 'bg-amber-100 text-amber-800',
  OUT_OF_STOCK: 'bg-rose-100 text-rose-700',
};
const STATUS_LABELS = { GOOD: 'Good', LOW: 'Low Stock', OUT_OF_STOCK: 'Out of Stock' };

// ── Restock Modal ─────────────────────────────────────────────────────────────
function RestockModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState(String(item.unitCost));
  const [supplier, setSupplier] = useState(item.supplier ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qtyNum = parseInt(qty, 10);
    const costNum = parseInt(cost, 10);
    if (!qtyNum || !costNum) return;
    inventoryStore.restock(item.id, qtyNum, costNum, supplier, 'HIRWA Triphine');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Restock — {item.name}</h2>
          <button type="button" onClick={onClose}><XCircle className="h-4 w-4 text-text-muted" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Quantity to add ({item.unit})</label>
            <input
              required type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Unit cost (RWF)</label>
            <input
              required type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Supplier</label>
            <input
              value={supplier} onChange={(e) => setSupplier(e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>
          {qty && cost && (
            <div className="rounded bg-primary/5 px-3 py-2 text-xs text-text">
              Total cost: <span className="font-bold font-mono text-primary">
                {(parseInt(qty || '0') * parseInt(cost || '0')).toLocaleString()} RWF
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm">Confirm Restock</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function InventoryPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('All Items');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<InventoryCategory | 'ALL'>('ALL');
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => { const u = inventoryStore.subscribe(refresh); return () => { u(); }; }, [refresh]);

  const items = inventoryStore.getItems();
  const lowItems = inventoryStore.getLowStockItems();
  const purchases = inventoryStore.getPurchases();

  const totalValue = items.reduce((a, i) => a + i.stockQty * i.unitCost, 0);
  const outCount = items.filter((i) => getStockStatus(i) === 'OUT_OF_STOCK').length;

  const filteredItems = items.filter((i) => {
    const matchCat = catFilter === 'ALL' || i.category === catFilter;
    const matchSearch = !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.supplier?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchCat && matchSearch;
  });

  const displayItems = tab === 'Low Stock' ? lowItems : filteredItems;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock and supplies for the laundry operations."
        action={
          <Button variant="secondary" onClick={() => alert('Add Item form — coming in API phase')}>
            <Plus className="mr-1 h-4 w-4" /> Add Item
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Total Items</div>
          <div className="text-2xl font-bold text-primary">{items.length}</div>
          <div className="text-xs text-text-muted mt-1">across all categories</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Low / Out</div>
          <div className="text-2xl font-bold text-amber-600">{lowItems.length}</div>
          <div className="text-xs text-text-muted mt-1">{outCount} out of stock</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Stock Value</div>
          <div className="text-xl font-bold text-text font-mono">{totalValue.toLocaleString()}</div>
          <div className="text-xs text-text-muted mt-1">RWF total</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Purchases (all time)</div>
          <div className="text-2xl font-bold text-text">{purchases.length}</div>
          <div className="text-xs text-text-muted mt-1">restock transactions</div>
        </Card>
      </div>

      {/* Low stock alert banner */}
      {lowItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm font-semibold text-amber-900">
            {lowItems.length} item{lowItems.length !== 1 ? 's' : ''} need restocking:
          </span>
          <div className="flex flex-wrap gap-2">
            {lowItems.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setRestockItem(i)}
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium',
                  getStockStatus(i) === 'OUT_OF_STOCK' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800',
                )}
              >
                {i.name} ({i.stockQty} {i.unit})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {t}
            {t === 'Low Stock' && lowItems.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                {lowItems.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* All Items / Low Stock tab content */}
      {tab !== 'Purchases' && (
        <div className="space-y-4">
          {tab === 'All Items' && (
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items…"
                  className="w-full max-w-xs rounded border border-border bg-surface pl-8 pr-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCatFilter('ALL')}
                  className={cn('rounded-full border px-3 py-1 text-xs font-medium', catFilter === 'ALL' ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-muted hover:bg-border/20')}
                >All</button>
                {ALL_CATS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatFilter(cat)}
                    className={cn('rounded-full border px-3 py-1 text-xs font-medium', catFilter === cat ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-muted hover:bg-border/20')}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Card className="p-0 overflow-hidden">
            {displayItems.length === 0 ? (
              <div className="p-8">
                <EmptyState icon={Package} title="No items found" description="Try adjusting your filters." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-border/20 text-text-muted font-medium uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3 text-right">Min</th>
                      <th className="px-4 py-3 text-right">Unit Cost</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayItems.map((item) => {
                      const status = getStockStatus(item);
                      return (
                        <tr key={item.id} className="hover:bg-border/10">
                          <td className="px-4 py-3 font-medium text-text">{item.name}</td>
                          <td className="px-4 py-3 text-text-muted">{CATEGORY_LABELS[item.category]}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-text">
                            {item.stockQty} <span className="text-text-muted font-normal">{item.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-text-muted">
                            {item.minQty} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-text-muted">
                            {item.unitCost.toLocaleString()} RWF
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('rounded px-2 py-0.5 text-[11px] font-medium', STATUS_STYLES[status])}>
                              {STATUS_LABELS[status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-muted">{item.supplier ?? '—'}</td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant={status === 'GOOD' ? 'ghost' : 'secondary'}
                              onClick={() => setRestockItem(item)}
                            >
                              <ShoppingCart className="mr-1 h-3 w-3" /> Restock
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Purchases tab */}
      {tab === 'Purchases' && (
        <Card className="p-0 overflow-hidden">
          {purchases.length === 0 ? (
            <div className="p-8">
              <EmptyState icon={ShoppingCart} title="No purchases recorded" description="Restock events will appear here." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-border/20 text-text-muted font-medium uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-right">Qty Added</th>
                    <th className="px-4 py-3 text-right">Unit Cost</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Purchased By</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-border/10">
                      <td className="px-4 py-2.5 font-medium text-text">{p.itemName}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{p.qtyAdded}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-muted">{p.unitCost.toLocaleString()} RWF</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-primary">{p.totalCost.toLocaleString()} RWF</td>
                      <td className="px-4 py-2.5 text-text-muted">{p.supplier ?? '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted">{p.purchasedBy}</td>
                      <td className="px-4 py-2.5 text-text-muted">{new Date(p.purchasedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {restockItem && <RestockModal item={restockItem} onClose={() => setRestockItem(null)} />}
    </div>
  );
}
