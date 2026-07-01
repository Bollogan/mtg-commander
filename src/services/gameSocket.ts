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
  disconnect: () => void;
}

/**
 * Opens a socket.io connection (websocket transport only) to the gateway, authenticating with the
 * JWT in the handshake. Joins the room, then invokes {@code onState} on every broadcast. Errors
 * (rejected actions, failed handshake) are surfaced via onError.
 */
export const connectToGame = (
  roomId: string,
  onState: (state: GameState) => void,
  onError?: (message: string) => void,
): GameConnection => {
  const { origin, path } = target();

  const socket = io(origin, {
    path,
    transports: ['websocket'],
    auth: { token: localStorage.getItem(TOKEN_KEY) ?? '' },
    reconnectionDelay: 3000,
  });

  socket.on('connect', () => {
    socket.emit('join', { roomId });
  });
  socket.on('state', (state: GameState) => onState(state));
  socket.on('error', (err: { message?: string }) => onError?.(err?.message ?? 'Game action rejected'));
  socket.on('connect_error', (err: Error) => onError?.(err.message || 'WebSocket connection error'));

  return {
    socket,
    sendAction: (action: GameAction) => {
      socket.emit('action', { roomId, action });
    },
    disconnect: () => {
      socket.disconnect();
    },
  };
};
