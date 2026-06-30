import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

/**
 * Shared post-authentication flow for the login and register pages. Ensures a profile exists
 * for the freshly authenticated user, then navigates back to wherever they came from (set by
 * RequireAuth as `location.state.from`) or to a sensible default.
 */
export function useAuthFlow() {
  const navigate = useNavigate();
  const location = useLocation();

  return async (userId?: string) => {
    // Ensure a profile exists for the freshly authenticated user.
    try {
      await apiClient.post('/api/users/me');
    } catch {
      // non-fatal; profile will be lazily created on first access
    }
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from ?? (userId ? `/users/${userId}` : '/forums'), { replace: true });
  };
}
