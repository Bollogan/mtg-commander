import { useEffect } from 'react';
import { API_BASE } from '../../api/client';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchRecentNotifications,
  notificationReceived,
  setConnected,
  type Notification,
} from './notificationsSlice';

/**
 * Subscribes to the notification-service SSE stream through the gateway. Uses a fetch
 * ReadableStream (not EventSource) so the JWT can travel in the Authorization header.
 * Reconnects with backoff and backfills missed notifications on (re)connect.
 */
export function useNotificationStream() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);

  useEffect(() => {
    if (!token) {
      dispatch(setConnected(false));
      return;
    }

    let cancelled = false;
    let retry = 0;
    let controller: AbortController | null = null;

    const connect = async () => {
      controller = new AbortController();
      try {
        const response = await fetch(`${API_BASE}/api/notifications/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          throw new Error(`SSE failed: ${response.status}`);
        }

        dispatch(setConnected(true));
        dispatch(fetchRecentNotifications());
        retry = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line.
          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            handleFrame(frame);
          }
        }
      } catch {
        // fall through to reconnect
      }

      dispatch(setConnected(false));
      if (!cancelled) {
        retry = Math.min(retry + 1, 6);
        setTimeout(connect, 1000 * retry);
      }
    };

    const handleFrame = (frame: string) => {
      const lines = frame.split('\n');
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (event !== 'notification' || dataLines.length === 0) return;
      try {
        const payload = JSON.parse(dataLines.join('\n')) as Notification;
        dispatch(notificationReceived(payload));
      } catch {
        // ignore malformed frame
      }
    };

    connect();

    return () => {
      cancelled = true;
      controller?.abort();
      dispatch(setConnected(false));
    };
  }, [token, dispatch]);
}
