import { NavLink } from 'react-router-dom';
import { allNavItems } from '../layouts/nav-config';
import { cn } from '../lib/cn';

/**
 * Mobile-only destination for the bottom nav's "More" tab - holds every
 * sidebar item not already pinned to the bottom nav (Home/Orders/Jobs).
 */
export function MoreMenu() {
  const pinned = new Set(['/', '/orders', '/laundry']);
  const items = allNavItems.filter((item) => !pinned.has(item.path));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">More</h1>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium text-text',
                  isActive && 'text-primary',
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
