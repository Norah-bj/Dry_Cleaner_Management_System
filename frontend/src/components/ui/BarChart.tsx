interface BarChartProps {
  data: { label: string; value: number; title?: string }[];
  /** Formats the value shown on hover/under each bar. */
  format?: (n: number) => string;
  height?: number;
}

/**
 * A small dependency-free vertical bar chart (DESIGN-SYSTEM.md: charts only
 * where they answer a real question). Each bar carries its exact value as
 * text for screen readers and on hover - never colour or height alone.
 */
export function BarChart({ data, format = (n) => n.toLocaleString(), height = 120 }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const denseLabels = data.length > 14;
  return (
    <div role="list" className="flex items-end gap-1" style={{ height: height + 28 }}>
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} role="listitem" className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${d.title ?? d.label}: ${format(d.value)}`}>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-primary/80"
              style={{ height: `${Math.max(d.value > 0 ? 3 : 0, (d.value / max) * height)}px` }}
              aria-hidden="true"
            />
          </div>
          <span className="sr-only">{`${d.title ?? d.label}: ${format(d.value)}`}</span>
          <span className="w-full truncate text-center text-[10px] text-text-muted" aria-hidden="true">
            {denseLabels && i % Math.ceil(data.length / 10) !== 0 ? '' : d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

interface BarListProps {
  rows: { label: string; value: number; detail?: string }[];
  format?: (n: number) => string;
  empty?: string;
}

/** Horizontal bars for "top N" lists (items, methods, tiers). */
export function BarList({ rows, format = (n) => n.toLocaleString(), empty = 'Nothing in this period.' }: BarListProps) {
  if (rows.length === 0) return <p className="text-xs text-text-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-xs">
          <div className="mb-0.5 flex justify-between gap-2">
            <span className="truncate text-text">{r.label}</span>
            <span className="whitespace-nowrap font-mono text-text">{format(r.value)}{r.detail ? <span className="text-text-muted"> · {r.detail}</span> : null}</span>
          </div>
          <div className="h-1.5 rounded bg-border/40">
            <div className="h-1.5 rounded bg-primary/70" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
