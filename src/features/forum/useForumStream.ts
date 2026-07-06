import { useEffect } from 'react';
import { API_BASE } from '../../api/client';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchComments,
  fetchPosts,
  forumEventReceived,
  setStreamConnected,
  type ForumEvent,
} from './forumSlice';

/**
 * Subscribes to a forum's realtime SSE stream (Phase 6) through the gateway. Uses a fetch
 * ReadableStream (not EventSource) so the JWT can travel in the Authorization header. On each
 * event it updates the store and refreshes the affected posts/comments so the thread stays live.
 * Reconnects with backoff.
 */
export function useForumStream(forumId: string | undefined) {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);

  useEffect(() => {
    if (!forumId || !token) {
      dispatch(setStreamConnected(false));
      return;
    }

    let cancelled = false;
    let retry = 0;
    let controller: AbortController | null = null;

    const apply = (ev: ForumEvent) => {
      dispatch(forumEventReceived(ev));
      switch (ev.type) {
        case 'NEW_POST':
          dispatch(fetchPosts(forumId));
          break;
        case 'NEW_REPLY':
          dispatch(fetchPosts(forumId)); // refresh reply counts
          if (ev.postId) dispatch(fetchComments(ev.postId));
          break;
        default:
          break; // MEMBER_*, CONTENT_* handled via store flags
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
      if (event !== 'forum-event' || dataLines.length === 0) return;
      try {
        apply(JSON.parse(dataLines.join('\n')) as ForumEvent);
      } catch {
        // ignore malformed frame
      }
    };

    const connect = async () => {
      controller = new AbortController();
      try {
        const response = await fetch(`${API_BASE}/api/forums/${forumId}/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`SSE failed: ${response.status}`);

        dispatch(setStreamConnected(true));
        retry = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
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

      dispatch(setStreamConnected(false));
      if (!cancelled) {
        retry = Math.min(retry + 1, 6);
        setTimeout(connect, 1000 * retry);
      }
    };

    connect();

    return () => {
      cancelled = true;
      controller?.abort();
      dispatch(setStreamConnected(false));
    };
  }, [forumId, token, dispatch]);
}
