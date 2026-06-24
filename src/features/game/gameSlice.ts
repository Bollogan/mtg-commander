import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';

// ─── Types (mirror game-service domain) ──────────────────────────────────────

export type ActionType = 'SHUFFLE' | 'DRAW' | 'PLAY_CARD' | 'TAP' | 'MULLIGAN' | 'END_TURN';

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
  library: GameCard[];
  hand: GameCard[];
  battlefield: GameCard[];
  graveyard: GameCard[];
  life: number;
  mulliganCount: number;
}

export interface GameState {
  roomId: string;
  name: string;
  maxPlayers: number;
  turn: number;
  activePlayerId: string;
  players: PlayerState[];
}

interface GameSliceState {
  current: GameState | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: GameSliceState = {
  current: null,
  status: 'idle',
  error: null,
};

// ─── REST thunks (room lifecycle, through the gateway) ───────────────────────

export const createRoom = createAsyncThunk(
  'game/createRoom',
  async (req: { name: string; maxPlayers: number; deckId?: string }) => {
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

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // Applied on every STOMP broadcast — Redis/game-service is the source of truth.
    setGameState(state, action: PayloadAction<GameState>) {
      state.current = action.payload;
    },
    setGameError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    clearGame(state) {
      state.current = null;
      state.error = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRoom.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(createRoom.fulfilled, (s, a) => { s.status = 'succeeded'; s.current = a.payload; })
      .addCase(createRoom.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message ?? 'Failed'; })
      .addCase(joinRoom.fulfilled, (s, a) => { s.status = 'succeeded'; s.current = a.payload; })
      .addCase(joinRoom.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message ?? 'Failed to join'; })
      .addCase(fetchRoom.fulfilled, (s, a) => { s.current = a.payload; });
  },
});

export const { setGameState, setGameError, clearGame } = gameSlice.actions;

export default gameSlice.reducer;
