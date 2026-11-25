import { useCallback, useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError } from '../../components/ui/LoadError';
import { apiFetch } from '../../lib/api-client';
import { errorMessage } from '../../lib/error-message';
import type { PaginatedResult } from '../../types/customer';

interface AuditLog {
  id: string;
  actorName: string | null;
  action: string;
  entityType: string;
  summary: string;
  createdAt: string;
}

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Everything' },
  { value: 'payment', label: 'Payments' },
  { value: 'order', label: 'Orders' },
  { value: 'user', label: 'Staff logins' },
  { value: 'price_list', label: 'Prices' },
  { value: 'settings', label: 'Settings' },
  { value: 'inventory', label: 'Stock counts' },
];

const PER_PAGE = 50;

/** Who did what: payments, status changes, order edits, staff/role, price and settings changes. */
export function ActivityLogSection() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) });
      if (filter) q.set('entityType', filter);
      const res = await apiFetch<PaginatedResult<AuditLog>>(`/audit-logs?${q.toString()}`);
      setLogs(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(errorMessage(err, 'load the activity log'));
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Activity Log</h2>
          <p className="text-xs text-text-muted">
            Every payment, status change, order edit, staff change, price change and stock count, with who did it.
            Entries can't be edited or deleted.
          </p>
        </div>
        <select
          aria-label="Show"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
        >
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {error && <LoadError message={error} onRetry={() => void load()} />}

      {loading && logs.length === 0 ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : logs.length === 0 && !error ? (
        <EmptyState icon={History} title="Nothing recorded yet" description="Actions appear here as staff use the system." />
      ) : (
        <ul className="divide-y divide-border rounded border border-border">
          {logs.map((l) => (
            <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-xs">
              <span className="min-w-0 flex-1 text-text">{l.summary}</span>
              <span className="whitespace-nowrap text-text-muted">
                {l.actorName ?? 'System'} ·{' '}
                {new Date(l.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</Button>
          <span className="text-text-muted">Page {page} of {pages}</span>
          <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Older</Button>
        </div>
      )}
    </Card>
  );
}
