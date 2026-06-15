import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login, register } from '../../features/auth/authSlice';

/** Combined login / register form. On success it provisions the user's profile (POST /users/me). */
export function AuthPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status = useAppSelector((s) => s.auth.status);
  const error = useAppSelector((s) => s.auth.error);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = mode === 'login'
      ? login({ email, password })
      : register({ email, displayName, password });
    const result = await dispatch(action);
    if (login.fulfilled.match(result) || register.fulfilled.match(result)) {
      // Ensure a profile exists for the freshly authenticated user.
      try {
        await apiClient.post('/api/users/me');
      } catch {
        // non-fatal; profile will be lazily created on first access
      }
      const userId = (result.payload as { userId?: string }).userId;
      navigate(userId ? `/users/${userId}` : '/forums');
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => setMode('login')}>Login</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => setMode('register')}>Register</button>
        </li>
      </ul>

      <form onSubmit={submit}>
        <input type="email" className="form-control mb-2" placeholder="Email" required
               value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode === 'register' && (
          <input type="text" className="form-control mb-2" placeholder="Display name" required
                 value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        )}
        <input type="password" className="form-control mb-2" placeholder="Password" required
               value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <button type="submit" className="btn btn-primary w-100" disabled={status === 'loading'}>
          {status === 'loading' ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
