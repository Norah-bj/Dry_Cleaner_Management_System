import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * "No data yet" state - explains what will appear and how, per
 * docs/design/DESIGN-SYSTEM.md: never a bare "No data."
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
      {Icon && <Icon className="h-6 w-6 text-text-muted" aria-hidden="true" />}
      <p className="text-sm font-medium text-text">{title}</p>
      {description && (
        <p className="max-w-xs text-xs text-text-muted">{description}</p>
      )}
      {action}
    </div>
  );
}
