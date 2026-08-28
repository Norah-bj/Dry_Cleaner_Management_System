import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronUp, LogOut, Settings } from 'lucide-react';
import { cn } from '../lib/cn';
import { useAuth } from '../features/auth/use-auth';
import { ROLE_LABELS } from '../types/auth';

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

/**
 * Sidebar footer: real signed-in user identity + a popover with
 * "Profile & Settings" (link to /settings) and "Log out" (ends the
 * session and returns to /login).
 */
export function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  if (!user) return null;

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

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
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
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
        title={collapsed ? user.fullName : undefined}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
          {initials(user.fullName) || user.email[0]?.toUpperCase()}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium text-text">
                {user.fullName}
              </span>
              <span className="block truncate text-xs text-text-muted">
                {ROLE_LABELS[user.role]}
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
