import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, LogOut, Settings, User } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Sidebar footer: user identity + a popover with "Profile & Settings"
 * (real link, /settings already routes) and "Log out" (disabled - there's
 * no auth session to end yet; auth/RBAC is the next phase). No fabricated
 * name/role - shown as a generic "Staff" placeholder until sign-in exists.
 */
export function UserMenu({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative border-t border-border p-3">
      {open && (
        <div className="absolute bottom-full left-3 mb-2 w-56 overflow-hidden rounded-md border border-border bg-surface shadow-md">
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-primary-light hover:text-primary"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Profile &amp; Settings
          </Link>
          <button
            type="button"
            disabled
            title="Available once sign-in is implemented"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger/60 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md py-1.5 hover:bg-border/50',
          collapsed ? 'justify-center' : 'px-1.5',
        )}
        aria-expanded={open}
        aria-label="Account menu"
        title={collapsed ? 'Account menu' : undefined}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
          <User className="h-4 w-4" aria-hidden="true" />
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium text-text">
                Staff
              </span>
              <span className="block truncate text-xs text-text-muted">
                Not signed in
              </span>
            </span>
            <ChevronUp
              className={cn(
                'h-4 w-4 shrink-0 text-text-muted transition-transform',
                open && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </>
        )}
      </button>
    </div>
  );
}
