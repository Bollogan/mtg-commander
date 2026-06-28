import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';

// ─── Types (mirror deck-service DTOs) ────────────────────────────────────────

export interface ScryfallImageUris {
  small: string | null;
  normal: string | null;
  large: string | null;
  artCrop: string | null;
}

export interface ScryfallCard {
  id: string;
  name: string;
  manaCost: string;
  cmc: number;
  colors: string[];
  colorIdentity: string[];
  typeLine: string;
  oracleText: string;
  power: string | null;
  toughness: string | null;
  imageUris: ScryfallImageUris | null;
  setName: string;
  rarity: string;
}

export interface KeywordSynergy {
  keyword: string;
  cardCount: number;
}

export interface DeckStats {
  totalCards: number;
  manaCurve: Record<string, number>;
  typeDistribution: Record<string, number>;
  colorDistribution: Record<string, number>;
  synergies: KeywordSynergy[];
  averageCmc: number;
}

export interface DeckCard {
  scryfallId: string;
  qty: number;
  name: string;
  manaCost: string | null;
  cmc: number;
  typeLine: string | null;
  colors: string[] | null;
  oracleText: string | null;
  imageUrl: string | null;
  category: string | null;
}

export type DeckVisibility = 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC';

export interface DeckSummary {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  format: string;
  visibility: DeckVisibility;
  description: string | null;
  commanderName: string | null;
  totalCards: number;
  updatedAt: string;
}

export interface Deck {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  name: string;
  format: string;
  visibility: DeckVisibility;
  description: string | null;
  commanderName: string | null;
  cards: DeckCard[];
  stats: DeckStats;
  createdAt: string;
  updatedAt: string;
}

export interface Suggestion {
  scryfallId: string;
  name: string;
  imageUrl: string | null;
  reason: string;
  source: 'ai' | 'mock';
}

export interface DeckDraft {
  id: string | null;
  name: string;
  format: string;
  visibility: DeckVisibility;
  description: string;
  commanderName: string;
  cards: DeckCard[];
}

interface DeckState {
  myDecks: DeckSummary[];
  current: Deck | null;
  draft: DeckDraft;
  searchResults: ScryfallCard[];
  searchStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  suggestions: Suggestion[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const emptyDraft = (): DeckDraft => ({
  id: null,
  name: 'New Deck',
  format: 'commander',
  visibility: 'PRIVATE',
  description: '',
  commanderName: '',
  cards: [],
});

const initialState: DeckState = {
  myDecks: [],
  current: null,
  draft: emptyDraft(),
  searchResults: [],
  searchStatus: 'idle',
  suggestions: [],
  status: 'idle',
  error: null,
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchMyDecks = createAsyncThunk('deck/fetchMyDecks', async () => {
  const { data } = await apiClient.get<DeckSummary[]>('/api/decks/me');
  return data;
});

export const fetchDeck = createAsyncThunk('deck/fetchDeck', async (id: string) => {
  const { data } = await apiClient.get<Deck>(`/api/decks/${id}`);
  return data;
});

export const searchCards = createAsyncThunk('deck/searchCards', async (query: string) => {
  const { data } = await apiClient.get<{ cards: ScryfallCard[] }>('/api/decks/cards/search', {
    params: { q: query, page: 1 },
  });
  return data.cards;
});

export const fetchSuggestions = createAsyncThunk('deck/fetchSuggestions', async (id: string) => {
  const { data } = await apiClient.get<Suggestion[]>(`/api/decks/${id}/suggestions`);
  return data;
});

export const saveDraft = createAsyncThunk(
  'deck/saveDraft',
  async (draft: DeckDraft) => {
    const body = {
      name: draft.name,
      format: draft.format,
      visibility: draft.visibility,
      description: draft.description || null,
      commanderName: draft.commanderName || null,
      cards: draft.cards.map((c) => ({
        scryfallId: c.scryfallId,
        qty: c.qty,
        category: c.category,
      })),
    };
    if (draft.id) {
      const { data } = await apiClient.put<Deck>(`/api/decks/${draft.id}`, body);
      return data;
    }
    const { data } = await apiClient.post<Deck>('/api/decks', body);
    return data;
  },
);

export const deleteDeck = createAsyncThunk('deck/deleteDeck', async (id: string) => {
  await apiClient.delete(`/api/decks/${id}`);
  return id;
});

// ─── Helpers ───────────────────────────────────────────────────────────────

const toDeckCard = (c: ScryfallCard): DeckCard => ({
  scryfallId: c.id,
  qty: 1,
  name: c.name,
  manaCost: c.manaCost,
  cmc: c.cmc,
  typeLine: c.typeLine,
  colors: c.colors,
  oracleText: c.oracleText,
  imageUrl: c.imageUris?.normal ?? c.imageUris?.small ?? null,
  category: null,
});

const draftFromDeck = (deck: Deck): DeckDraft => ({
  id: deck.id,
  name: deck.name,
  format: deck.format,
  visibility: deck.visibility,
  description: deck.description ?? '',
  commanderName: deck.commanderName ?? '',
  cards: deck.cards.map((c) => ({ ...c })),
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const deckSlice = createSlice({
  name: 'deck',
  initialState,
  reducers: {
    newDraft(state) {
      state.draft = emptyDraft();
      state.current = null;
      state.suggestions = [];
    },
    setDraftMeta(state, action: PayloadAction<Partial<Omit<DeckDraft, 'cards' | 'id'>>>) {
      state.draft = { ...state.draft, ...action.payload };
    },
    addCardToDraft(state, action: PayloadAction<ScryfallCard>) {
      const existing = state.draft.cards.find((c) => c.scryfallId === action.payload.id);
      if (existing) {
        existing.qty += 1;
      } else {
        state.draft.cards.push(toDeckCard(action.payload));
      }
    },
    changeQty(state, action: PayloadAction<{ scryfallId: string; delta: number }>) {
      const card = state.draft.cards.find((c) => c.scryfallId === action.payload.scryfallId);
      if (!card) return;
      card.qty += action.payload.delta;
      if (card.qty <= 0) {
        state.draft.cards = state.draft.cards.filter(
          (c) => c.scryfallId !== action.payload.scryfallId,
        );
      }
    },
    removeCardFromDraft(state, action: PayloadAction<string>) {
      state.draft.cards = state.draft.cards.filter((c) => c.scryfallId !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyDecks.fulfilled, (s, a) => {
        s.myDecks = a.payload;
      })
      .addCase(fetchDeck.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(fetchDeck.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.current = a.payload;
        s.draft = draftFromDeck(a.payload);
      })
      .addCase(fetchDeck.rejected, (s, a) => {
        s.status = 'failed';
        s.error = a.error.message ?? 'Failed to load deck';
      })
      .addCase(searchCards.pending, (s) => {
        s.searchStatus = 'loading';
      })
      .addCase(searchCards.fulfilled, (s, a) => {
        s.searchStatus = 'succeeded';
        s.searchResults = a.payload;
      })
      .addCase(searchCards.rejected, (s) => {
        s.searchStatus = 'failed';
      })
      .addCase(saveDraft.fulfilled, (s, a) => {
        s.current = a.payload;
        s.draft = draftFromDeck(a.payload);
        const idx = s.myDecks.findIndex((d) => d.id === a.payload.id);
        const summary: DeckSummary = {
          id: a.payload.id,
          ownerId: a.payload.ownerId,
          ownerName: a.payload.ownerName,
          name: a.payload.name,
          format: a.payload.format,
          visibility: a.payload.visibility,
          description: a.payload.description,
          commanderName: a.payload.commanderName,
          totalCards: a.payload.stats.totalCards,
          updatedAt: a.payload.updatedAt,
        };
        if (idx >= 0) s.myDecks[idx] = summary;
        else s.myDecks.unshift(summary);
      })
      .addCase(deleteDeck.fulfilled, (s, a) => {
        s.myDecks = s.myDecks.filter((d) => d.id !== a.payload);
        if (s.current?.id === a.payload) s.current = null;
      })
      .addCase(fetchSuggestions.fulfilled, (s, a) => {
        s.suggestions = a.payload;
      });
  },
});

export const {
  newDraft,
  setDraftMeta,
  addCardToDraft,
  changeQty,
  removeCardFromDraft,
} = deckSlice.actions;

export default deckSlice.reducer;
