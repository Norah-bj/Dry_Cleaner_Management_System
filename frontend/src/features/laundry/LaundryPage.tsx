import { PageHeader } from '../../components/ui/PageHeader';

const STAGES = [
  'Received',
  'Sorting',
  'Washing',
  'Drying',
  'Ironing',
  'Quality Check',
  'Packing',
  'Ready',
];

/**
 * Priority item #9. Kanban board by stage, per DESIGN-SYSTEM.md. No
 * Laundry/Orders backend yet, so every column is genuinely empty - a
 * real board shape, zero counts, not fabricated numbers.
 */
export function LaundryPage() {
  return (
    <div>
      <PageHeader
        title="Laundry"
        description="What needs attention right now, by stage."
      />

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="w-52 shrink-0 rounded-lg border border-border bg-surface p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{stage}</h2>
              <span className="text-xs text-text-muted">0</span>
            </div>
            <p className="text-xs text-text-muted">No orders in this stage.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
