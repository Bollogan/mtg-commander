import { useState } from 'react';
import { Alert, Button, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAppDispatch } from '../store/hooks';
import { logout } from '../features/auth/authSlice';

/** RGPD self-service: data portability (export) and right to erasure (delete account). */
export const AccountPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setError(null);
    setBusy(true);
    try {
      const { data } = await apiClient.get('/api/users/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mtg-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not export your data. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm('This permanently deletes your account and all your data. Continue?')) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await apiClient.delete('/api/users/me');
      dispatch(logout());
      navigate('/');
    } catch {
      setError('Could not delete your account. Try again.');
      setBusy(false);
    }
  };

  return (
    <Container className="page-container content-narrow">
      <div className="page-header" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
        <h1>Account &amp; privacy</h1>
        <p className="text-muted mb-0">Manage the data we hold about you under GDPR.</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <section className="deck-card settings-card">
        <h2>Your data</h2>
        <p className="settings-lead">
          Download a copy of everything we store about you — your profile, follows, badges and decks —
          as a single JSON file.
        </p>
        <Button variant="outline-primary" onClick={onExport} disabled={busy}>
          {busy ? 'Working…' : 'Export my data'}
        </Button>
      </section>

      <section className="deck-card settings-card danger-zone">
        <h2>Delete account</h2>
        <p className="settings-lead">
          This permanently deletes your account. The removal fans out across every service and erases
          your decks, posts, comments and notifications. This cannot be undone.
        </p>
        <Button variant="outline-danger" onClick={onDelete} disabled={busy}>
          Delete my account
        </Button>
      </section>
    </Container>
  );
};
