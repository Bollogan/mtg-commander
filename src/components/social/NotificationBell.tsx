import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { markAllRead } from '../../features/notifications/notificationsSlice';

/** Header bell showing unread count and a dropdown of recent notifications fed by the SSE stream. */
export function NotificationBell() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.notifications.items);
  const unread = useAppSelector((s) => s.notifications.unread);
  const connected = useAppSelector((s) => s.notifications.connected);
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) return null;

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) dispatch(markAllRead());
  };

  return (
    <div className="position-relative">
      <button type="button" className="btn btn-link position-relative" onClick={toggle}
              title={connected ? 'Live' : 'Reconnecting…'}>
        🔔
        {unread > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card shadow position-absolute end-0" style={{ width: 320, zIndex: 1000 }}>
          <div className="card-header py-2 small fw-bold">
            Notifications {connected ? '' : '(offline)'}
          </div>
          <ul className="list-group list-group-flush" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.length === 0 && <li className="list-group-item text-muted small">Nothing yet.</li>}
            {items.map((n) => (
              <li key={n.id} className="list-group-item small">
                <div>{n.message}</div>
                <small className="text-muted">{new Date(n.createdAt).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
