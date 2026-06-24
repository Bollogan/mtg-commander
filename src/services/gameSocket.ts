import { Client, type IMessage } from '@stomp/stompjs';
import { API_BASE } from '../api/client';
import type { GameAction, GameState } from '../features/game/gameSlice';

/** Derives the ws:// (or wss://) broker URL from the HTTP API base. */
const brokerUrl = (): string => {
  const base = API_BASE.replace(/^http/, 'ws');
  return `${base}/ws/game`;
};

export interface GameConnection {
  client: Client;
  sendAction: (action: GameAction) => void;
  disconnect: () => void;
}

/**
 * Opens a STOMP connection (native WebSocket, no SockJS) to the gateway, subscribes to the
 * room topic and invokes {@code onState} on every broadcast. Errors are surfaced via onError.
 */
export const connectToGame = (
  roomId: string,
  onState: (state: GameState) => void,
  onError?: (message: string) => void,
): GameConnection => {
  const client = new Client({
    brokerURL: brokerUrl(),
    reconnectDelay: 3000,
    onConnect: () => {
      client.subscribe(`/topic/game/${roomId}`, (message: IMessage) => {
        try {
          onState(JSON.parse(message.body) as GameState);
        } catch {
          onError?.('Failed to parse game update');
        }
      });
      client.subscribe(`/topic/game/${roomId}/errors`, (message: IMessage) => {
        try {
          const err = JSON.parse(message.body) as { message: string };
          onError?.(err.message);
        } catch {
          onError?.('Game action rejected');
        }
      });
    },
    onStompError: (frame) => onError?.(frame.headers['message'] ?? 'STOMP error'),
    onWebSocketError: () => onError?.('WebSocket connection error'),
  });

  client.activate();

  return {
    client,
    sendAction: (action: GameAction) => {
      client.publish({
        destination: `/app/game/${roomId}/action`,
        body: JSON.stringify(action),
      });
    },
    disconnect: () => {
      void client.deactivate();
    },
  };
};
