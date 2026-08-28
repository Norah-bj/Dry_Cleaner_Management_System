import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/use-auth';

/** Redirects to /login (remembering where the user was headed) unless signed in. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}
