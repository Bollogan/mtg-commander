import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';

/**
 * Route guard for areas that need an account. When there is no active session it redirects to the
 * login page, remembering the attempted location so the user lands back there after signing in.
 */
export function RequireAuth({ children }: { children: ReactElement }) {
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
