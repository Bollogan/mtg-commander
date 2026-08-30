import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';

// ─── Types (mirror game-service domain) ──────────────────────────────────────

export type ActionType =
  | 'SHUFFLE'
  | 'DRAW'
  | 'PLAY_CARD'
  | 'TAP'
  | 'MULLIGAN'
  | 'END_TURN'
  | 'ADJUST_LIFE';

export type RoomStatus = 'LOBBY' | 'IN_GAME' | 'FINISHED';

export interface GameAction {
  type: ActionType;
  playerId: string;
  cardInstanceId?: string | null;
  count?: number | null;
}

export interface GameCard {
  instanceId: string;
  scryfallId: string;
  name: string;
  typeLine: string | null;
  imageUrl: string | null;
  tapped: boolean;
}

export interface PlayerState {
  playerId: string;
  playerName: string;
  /** Always empty: the server never discloses library contents. Use `librarySize`. */
  library: GameCard[];
  /** Only populated for the viewer's own seat; opponents send `handSize` instead. */
  hand: GameCard[];
  battlefield: GameCard[];
  graveyard: GameCard[];
  life: number;
  mulliganCount: number;
  deckId: string | null;
  deckName: string | null;
  ready: boolean;
  connected: boolean;
  librarySize: number;
  handSize: number;
}

export interface Spectator {
  userId: string;
  userName: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  /** Epoch millis. */
  sentAt: number;
}

export interface GameState {
  roomId: string;
  name: string;
  maxPlayers: number;
  turn: number;
  activePlayerId: string;
  players: PlayerState[];
  status: RoomStatus;
  hostId: string;
  publicRoom: boolean;
  spectators: Spectator[];
  chat: ChatMessage[];
  createdAt: number;
}

/** Row in the open-games browser (no zones, so listing rooms stays cheap). */
export interface RoomSummary {
  roomId: string;
  name: string;
  hostName: string;
  players: number;
  maxPlayers: number;
  status: RoomStatus;
  createdAt: number;
}

interface GameSliceState {
  current: GameState | null;
  lobbies: RoomSummary[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  /** Set when the host closes the room or the viewer is kicked, so the page can bow out. */
  closedReason: string | null;
}

const initialState: GameSliceState = {
  current: null,
  lobbies: [],
  status: 'idle',
  error: null,
  closedReason: null,
};

// ─── REST thunks (room lifecycle, through the gateway) ───────────────────────
// Everything that happens *inside* a room travels over socket.io instead — see gameSocket.ts.

export const createRoom = createAsyncThunk(
  'game/createRoom',
  async (req: { name: string; maxPlayers: number; deckId?: string; publicRoom: boolean }) => {
    const { data } = await apiClient.post<GameState>('/api/game/rooms', req);
    return data;
  },
);

export const joinRoom = createAsyncThunk(
  'game/joinRoom',
  async ({ roomId, deckId }: { roomId: string; deckId?: string }) => {
    const { data } = await apiClient.post<GameState>(`/api/game/rooms/${roomId}/join`, { deckId });
    return data;
  },
);

export const fetchRoom = createAsyncThunk('game/fetchRoom', async (roomId: string) => {
  const { data } = await apiClient.get<GameState>(`/api/game/rooms/${roomId}`);
  return data;
});

export const fetchPublicLobbies = createAsyncThunk('game/fetchPublicLobbies', async () => {
  const { data } = await apiClient.get<RoomSummary[]>('/api/game/rooms');
  return data;
});

export const leaveRoom = createAsyncThunk('game/leaveRoom', async (roomId: string) => {
  await apiClient.delete(`/api/game/rooms/${roomId}/members/me`);
});

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // Applied on every socket.io broadcast — Redis/game-service is the source of truth.
    setGameState(state, action: PayloadAction<GameState>) {
      state.current = action.payload;
    },
    setGameError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    setRoomClosed(state, action: PayloadAction<string>) {
      state.closedReason = action.payload;
      state.current = null;
    },
    clearGame(state) {
      state.current = null;
      state.error = null;
      state.closedReason = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRoom.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(createRoom.fulfilled, (s, a) => { s.status = 'succeeded'; s.current = a.payload; })
      .addCase(createRoom.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message ?? 'Failed'; })
      .addCase(joinRoom.fulfilled, (s, a) => { s.status = 'succeeded'; s.current = a.payload; s.closedReason = null; })
      .addCase(joinRoom.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message ?? 'Failed to join'; })
      .addCase(fetchRoom.fulfilled, (s, a) => { s.current = a.payload; })
      .addCase(fetchPublicLobbies.fulfilled, (s, a) => { s.lobbies = a.payload; })
      .addCase(leaveRoom.fulfilled, (s) => { s.current = null; });
  },
});

export const { setGameState, setGameError, setRoomClosed, clearGame } = gameSlice.actions;

export default gameSlice.reducer;
