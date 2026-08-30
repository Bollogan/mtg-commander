import { io, type Socket } from 'socket.io-client';
import { API_BASE, TOKEN_KEY } from '../api/client';
import type { GameAction, GameState } from '../features/game/gameSlice';

/**
 * Derives the socket.io {origin, path} from the HTTP API base so it works in every deploy:
 * - `https://host:7777/mtg-commander` → origin `https://host:7777`, path `/mtg-commander/socket.io`
 *   (the reverse proxy strips `/mtg-commander`, leaving `/socket.io` for the gateway).
 * - `http://localhost:11032` (local) → origin `http://localhost:11032`, path `/socket.io`.
 * - `''` (same-origin nginx build) → current origin, path `/socket.io`.
 */
const target = (): { origin: string; path: string } => {
  const u = new URL(API_BASE || window.location.origin, window.location.origin);
  const prefix = u.pathname.replace(/\/$/, '');
  return { origin: u.origin, path: `${prefix}/socket.io` };
};

export interface GameConnection {
  socket: Socket;
  sendAction: (action: GameAction) => void;
  sendChat: (text: string) => void;
  setReady: (ready: boolean) => void;
  chooseDeck: (deckId: string | null, deckName: string | null) => void;
  startGame: () => void;
  kick: (targetId: string) => void;
  transferHost: (targetId: string) => void;
  closeRoom: () => void;
  leave: () => void;
  disconnect: () => void;
}

export interface GameHandlers {
  onState: (state: GameState) => void;
  onError?: (message: string) => void;
  /** The host closed the room, or the viewer was kicked out of it. */
  onClosed?: (message: string) => void;
}

/**
 * Opens a socket.io connection to the gateway, authenticating with the JWT in the handshake, and
 * joins the room. This is the live channel for the whole room — lobby (ready, deck, start,
 * moderation), chat and play alike — so every member sees each change at the same moment.
 *
 * Transport order is socket.io's default: polling first, then a silent upgrade to WebSocket. That
 * matters in production — the reverse proxy in front of the gateway only forwards `Upgrade`
 * requests for its own paths and drops ours, so a websocket-only client never connects at all,
 * while polling connects immediately and upgrades wherever the upgrade does get through.
 */
export const connectToGame = (roomId: string, handlers: GameHandlers): GameConnection => {
  const { origin, path } = target();

  const socket = io(origin, {
    path,
    transports: ['polling', 'websocket'],
    // Read at connect time (and again on every reconnect) so a refreshed access token is used.
    auth: (cb) => cb({ token: localStorage.getItem(TOKEN_KEY) ?? '' }),
    reconnectionDelay: 3000,
  });

  socket.on('connect', () => {
    socket.emit('join', { roomId });
  });
  socket.on('state', (state: GameState) => handlers.onState(state));
  socket.on('error', (err: { message?: string }) =>
    handlers.onError?.(err?.message ?? 'Game action rejected'));
  socket.on('roomClosed', (err: { message?: string }) =>
    handlers.onClosed?.(err?.message ?? 'The room was closed'));
  socket.on('connect_error', (err: Error) =>
    handlers.onError?.(err.message || 'WebSocket connection error'));

  const emit = (event: string, payload: Record<string, unknown> = {}) =>
    socket.emit(event, { roomId, ...payload });

  return {
    socket,
    sendAction: (action: GameAction) => emit('action', { action }),
    sendChat: (text: string) => emit('chat', { text }),
    setReady: (ready: boolean) => emit('ready', { ready }),
    chooseDeck: (deckId, deckName) => emit('deck', { deckId, deckName }),
    startGame: () => emit('start'),
    kick: (targetId: string) => emit('kick', { targetId }),
    transferHost: (targetId: string) => emit('host', { targetId }),
    closeRoom: () => emit('close'),
    leave: () => emit('leave'),
    disconnect: () => socket.disconnect(),
  };
};
