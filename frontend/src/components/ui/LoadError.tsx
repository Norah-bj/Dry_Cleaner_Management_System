import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface LoadErrorProps {
  message: string;
  onRetry?: () => void;
}

/** Shown when real data couldn't be loaded. Never replaced by sample data. */
export function LoadError({ message, onRetry }: LoadErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-6 text-center"
    >
      <AlertTriangle className="h-6 w-6 text-rose-600" aria-hidden="true" />
      <p className="max-w-md text-sm text-rose-800">{message}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
