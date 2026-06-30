import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login } from '../features/auth/authSlice';
import { useAuthFlow } from '../features/auth/useAuthFlow';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

/** Sign-in page. Registration lives on its own page (/register) to keep the two flows separate. */
export function LoginPage() {
  const dispatch = useAppDispatch();
  const finishAuth = useAuthFlow();
  const status = useAppSelector((s) => s.auth.status);
  const error = useAppSelector((s) => s.auth.error);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      await finishAuth((result.payload as { userId?: string }).userId);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="auth-eyebrow">Planeswalkers Tower</span>
        <h1>Welcome back</h1>
        <p className="auth-sub">Log in to build decks, play and follow the community.</p>

        <form onSubmit={submit}>
          <input type="email" className="form-control" placeholder="Email" autoComplete="email" required
                 value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" className="form-control" placeholder="Password" autoComplete="current-password" required
                 value={password} onChange={(e) => setPassword(e.target.value)} />

          {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}

          <button type="submit" className="btn btn-primary w-100" disabled={status === 'loading'}>
            {status === 'loading' ? 'Please wait…' : 'Log in'}
          </button>
        </form>

        <GoogleSignInButton />

        <p className="auth-switch mb-0">
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
