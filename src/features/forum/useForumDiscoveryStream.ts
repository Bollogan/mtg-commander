import { useEffect } from 'react';
import { API_BASE } from '../../api/client';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { forumVoteUpdated, type ForumEvent } from './forumSlice';

/**
 * Subscribes to the cross-forum discovery SSE stream (`/api/forums/discovery/stream`) that powers the
 * mosaic. Unlike {@link useForumStream}, it isn't scoped to a single forum: it receives every forum's
 * FORUM_VOTE event and pushes the refreshed tallies into the store so cards across all rails update
 * live. Uses a fetch ReadableStream (not EventSource) so the JWT can travel in the Authorization
 * header, and reconnects with backoff.
 */
export function useForumDiscoveryStream() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let retry = 0;
    let controller: AbortController | null = null;

    const apply = (ev: ForumEvent) => {
      if (ev.type !== 'FORUM_VOTE' || !ev.forumId) return;
      dispatch(forumVoteUpdated({
        forumId: ev.forumId,
        upvotes: ev.upvotes ?? 0,
        downvotes: ev.downvotes ?? 0,
        score: ev.score ?? 0,
      }));
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
        const response = await fetch(`${API_BASE}/api/forums/discovery/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`SSE failed: ${response.status}`);
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

      if (!cancelled) {
        retry = Math.min(retry + 1, 6);
        setTimeout(connect, 1000 * retry);
      }
    };

    connect();

    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, [token, dispatch]);
}
