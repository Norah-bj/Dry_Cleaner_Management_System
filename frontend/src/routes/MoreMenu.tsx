import { LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { allNavItems } from '../layouts/nav-config';
import { cn } from '../lib/cn';
import { useAuth } from '../features/auth/use-auth';
import { ROLE_LABELS } from '../types/auth';

export function MoreMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pinned = new Set(['/', '/orders', '/laundry']);
  const items = allNavItems.filter((item) => !pinned.has(item.path));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">More</h1>

      {user && (
        <p className="mb-4 text-sm text-text-muted">
          Signed in as <span className="font-medium text-text">{user.fullName}</span>{' '}
          ({ROLE_LABELS[user.role]})
        </p>
      )}

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
        <li>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-danger"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Log out
          </button>
        </li>
      </ul>
    </div>
  );
}
