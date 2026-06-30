import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { register } from '../features/auth/authSlice';
import { useAuthFlow } from '../features/auth/useAuthFlow';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

/** Account creation page, kept separate from the sign-in page (/login) for a cleaner flow. */
export function RegisterPage() {
  const dispatch = useAppDispatch();
  const finishAuth = useAuthFlow();
  const status = useAppSelector((s) => s.auth.status);
  const error = useAppSelector((s) => s.auth.error);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(register({ email, displayName, password }));
    if (register.fulfilled.match(result)) {
      await finishAuth((result.payload as { userId?: string }).userId);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="auth-eyebrow">Planeswalkers Tower</span>
        <h1>Create your account</h1>
        <p className="auth-sub">Join the community to save decks, play and compete.</p>

        <form onSubmit={submit}>
          <input type="email" className="form-control" placeholder="Email" autoComplete="email" required
                 value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="text" className="form-control" placeholder="Display name" autoComplete="nickname" required
                 value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <input type="password" className="form-control" placeholder="Password" autoComplete="new-password" required
                 value={password} onChange={(e) => setPassword(e.target.value)} />

          {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}

          <button type="submit" className="btn btn-primary w-100" disabled={status === 'loading'}>
            {status === 'loading' ? 'Please wait…' : 'Create account'}
          </button>
        </form>

        <GoogleSignInButton />

        <p className="auth-switch mb-0">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
