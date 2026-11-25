import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { getSetupStatus } from '../../services/settings';
import type { SetupStatus } from '../../types/settings';

const LINKS: Record<string, string> = {
  prices: '/settings',
  payments: '/settings',
  contact: '/settings',
  hours: '/settings',
  slots: '/settings',
  staff: '/employees',
  drivers: '/employees',
};

/**
 * First-run checklist for the owner/manager: what still has to be entered
 * before the shop can run on EDCMS. Hidden once everything is done.
 */
export function SetupChecklist() {
  const [status, setStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    getSetupStatus()
      .then(setStatus)
      .catch(() => setStatus(null)); // Optional panel: no checklist if it can't load.
  }, []);

  if (!status || status.complete) return null;
  const done = status.items.filter((i) => i.done).length;

  return (
    <Card className="border-amber-300 bg-amber-50 p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-amber-900">Finish setting up the shop</h2>
        <span className="text-xs text-amber-800">{done} of {status.items.length} done</span>
      </div>
      <ul className="space-y-2">
        {status.items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 text-amber-600" aria-hidden="true" />
            )}
            {item.done ? (
              <span className="text-text-muted line-through">{item.label}</span>
            ) : (
              <Link to={LINKS[item.key] ?? '/settings'} className="font-medium text-amber-900 underline">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
