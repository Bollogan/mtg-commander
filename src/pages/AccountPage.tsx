import { useState } from 'react';
import { Alert, Button, Card, Stack } from 'react-bootstrap';
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
    <Card className="deck-card" style={{ maxWidth: 560, margin: '2rem auto' }}>
      <Card.Body>
        <Card.Title>Account &amp; privacy (GDPR)</Card.Title>
        {error && <Alert variant="danger">{error}</Alert>}
        <p className="text-muted">
          Download everything we store about you, or permanently delete your account.
          Deletion fans out across all services and removes your decks, posts and notifications.
        </p>
        <Stack direction="horizontal" gap={2}>
          <Button variant="outline-primary" onClick={onExport} disabled={busy}>
            Export my data
          </Button>
          <Button variant="outline-danger" onClick={onDelete} disabled={busy}>
            Delete my account
          </Button>
        </Stack>
      </Card.Body>
    </Card>
  );
};
