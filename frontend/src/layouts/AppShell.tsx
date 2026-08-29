import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bell, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { navGroups, mobileNavItems } from './nav-config';
import { UserMenu } from './UserMenu';

/**
 * Staff app shell: desktop sidebar + topbar, mobile bottom nav.
 * Driver and customer shells are separate, deliberately minimal
 * experiences (docs/design/DESIGN-SYSTEM.md #16/#17) - not this one.
 *
 * No route protection yet - auth/RBAC is the next phase. Search and
 * notifications are visually present but inert (no backend to query
 * yet); they're disabled rather than faked, per CLAUDE.md's rule
 * against simulating functionality that doesn't exist.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] md:flex',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className="flex h-16 items-center gap-2 overflow-hidden border-b border-border px-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            E
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold">
              EBENEZER
              <span className="block text-xs font-normal text-text-muted">
                Dry Cleaner
              </span>
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1 px-2 text-xs font-medium text-text-muted">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-text hover:bg-primary-light hover:text-primary',
                          isActive && 'bg-primary-light text-primary',
                        )
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <UserMenu collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden shrink-0 rounded-md p-1.5 text-text-muted hover:bg-border/50 md:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <span className="flex-1 text-sm font-semibold md:hidden">EBENEZER</span>

          <label className="relative hidden max-w-sm flex-1 md:block">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              disabled
              placeholder="Search orders, customers, phone numbers..."
              className="w-full rounded-md border border-border bg-background py-2 pr-3 pl-9 text-sm text-text-muted placeholder:text-text-muted disabled:cursor-not-allowed"
            />
          </label>

          <button
            type="button"
            disabled
            className="rounded-md p-2 text-text-muted disabled:cursor-not-allowed"
            aria-label="Notifications (not yet available)"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface md:hidden">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium text-text-muted',
                isActive && 'text-primary',
              )
            }
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
        <NavLink
          to="/more"
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium text-text-muted',
              isActive && 'text-primary',
            )
          }
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          More
        </NavLink>
      </nav>
    </div>
  );
}
