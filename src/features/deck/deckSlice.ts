import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';

// ─── Types (mirror deck-service DTOs) ────────────────────────────────────────

export interface ScryfallImageUris {
  small: string | null;
  normal: string | null;
  large: string | null;
  artCrop: string | null;
}

export interface ScryfallPrices {
  usd: number | null;
  usdFoil: number | null;
  eur: number | null;
  eurFoil: number | null;
  tix: number | null;
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
  legalities: Record<string, string> | null;
  prices: ScryfallPrices | null;
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
  // Whether this specific printing is tracked as foil (drives the price used for it).
  foil: boolean;
  // Denormalized for instant format validation in the builder (not persisted server-side).
  rarity: string | null;
  colorIdentity: string[] | null;
  legalities: Record<string, string> | null;
  // Current market prices per copy (from Scryfall), for deck total + per-section pricing.
  usd: number | null;
  usdFoil: number | null;
  eur: number | null;
  eurFoil: number | null;
}

export type DeckVisibility = 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC';

export interface DeckCategory {
  name: string;
  color: string | null;
  icon: string | null;
  order: number;
}

export interface CategoryTemplate {
  id: string;
  name: string;
  categories: DeckCategory[];
  global: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  categories: DeckCategory[];
  stats: DeckStats;
  views: number;
  likes: number;
  liked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeckPrices {
  usd: number;
  usdFoil: number;
  eur: number;
  eurFoil: number;
  tix: number;
  missingUsd: number;
  missingEur: number;
  totalCards: number;
}

export interface Suggestion {
  scryfallId: string;
  name: string;
  imageUrl: string | null;
  reason: string;
  source: 'ai' | 'mock';
}

export interface AutocompleteItem {
  id: string;
  name: string;
  manaCost: string | null;
  typeLine: string | null;
  imageUrl: string | null;
}

export interface DeckDraft {
  id: string | null;
  name: string;
  format: string;
  visibility: DeckVisibility;
  description: string;
  commanderName: string;
  cards: DeckCard[];
  categories: DeckCategory[];
}

export type PriceSource = 'usd' | 'eur';

interface DeckState {
  myDecks: DeckSummary[];
  current: Deck | null;
  prices: DeckPrices | null;
  priceSource: PriceSource;
  priceFoil: boolean;
  draft: DeckDraft;
  searchResults: ScryfallCard[];
  searchStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  autocompleteResults: AutocompleteItem[];
  autocompleteStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  suggestions: Suggestion[];
  categoryTemplates: CategoryTemplate[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
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
  categories: [],
});

const initialState: DeckState = {
  myDecks: [],
  current: null,
  prices: null,
  priceSource: 'usd',
  priceFoil: false,
  draft: emptyDraft(),
  searchResults: [],
  searchStatus: 'idle',
  autocompleteResults: [],
  autocompleteStatus: 'idle',
  suggestions: [],
  categoryTemplates: [],
  status: 'idle',
  saveStatus: 'idle',
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

export const autocompleteCards = createAsyncThunk(
  'deck/autocompleteCards',
  async ({ query, limit = 8, commanderOnly = false }: { query: string; limit?: number; commanderOnly?: boolean }) => {
    const { data } = await apiClient.get<AutocompleteItem[]>('/api/decks/cards/autocomplete', {
      params: { q: query, limit, commander: commanderOnly },
    });
    return data;
  },
);

export const fetchCardById = createAsyncThunk(
  'deck/fetchCardById',
  async (scryfallId: string) => {
    const { data } = await apiClient.get<ScryfallCard>(`/api/decks/cards/${scryfallId}`);
    return data;
  },
);

export const fetchCardByName = createAsyncThunk(
  'deck/fetchCardByName',
  async (exactName: string) => {
    const { data } = await apiClient.get<ScryfallCard>('/api/decks/cards/named', {
      params: { exact: exactName },
    });
    return data;
  },
);

export const fetchSuggestions = createAsyncThunk('deck/fetchSuggestions', async (id: string) => {
  const { data } = await apiClient.get<Suggestion[]>(`/api/decks/${id}/suggestions`);
  return data;
});

export const fetchCategoryTemplates = createAsyncThunk('deck/fetchCategoryTemplates', async () => {
  const { data } = await apiClient.get<CategoryTemplate[]>('/api/decks/category-templates');
  return data;
});

export const createCategoryTemplate = createAsyncThunk(
  'deck/createCategoryTemplate',
  async ({ name, categories }: { name: string; categories: DeckCategory[] }) => {
    const { data } = await apiClient.post<CategoryTemplate>('/api/decks/category-templates', {
      name,
      categories,
    });
    return data;
  },
);

export const deleteCategoryTemplate = createAsyncThunk(
  'deck/deleteCategoryTemplate',
  async (id: string) => {
    await apiClient.delete(`/api/decks/category-templates/${id}`);
    return id;
  },
);

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
        foil: c.foil,
      })),
      categories: draft.categories,
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

export const likeDeck = createAsyncThunk('deck/likeDeck', async (id: string) => {
  const { data } = await apiClient.post<Deck>(`/api/decks/${id}/like`);
  return data;
});

export const unlikeDeck = createAsyncThunk('deck/unlikeDeck', async (id: string) => {
  const { data } = await apiClient.delete<Deck>(`/api/decks/${id}/like`);
  return data;
});

export const fetchDeckPrices = createAsyncThunk('deck/fetchDeckPrices', async (id: string) => {
  const { data } = await apiClient.get<DeckPrices>(`/api/decks/${id}/prices`);
  return data;
});

export const fetchPrintings = createAsyncThunk('deck/fetchPrintings', async (name: string) => {
  const { data } = await apiClient.get<ScryfallCard[]>('/api/decks/cards/printings', {
    params: { name },
  });
  return data;
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
  foil: false,
  rarity: c.rarity ?? null,
  colorIdentity: c.colorIdentity ?? null,
  legalities: c.legalities ?? null,
  usd: c.prices?.usd ?? null,
  usdFoil: c.prices?.usdFoil ?? null,
  eur: c.prices?.eur ?? null,
  eurFoil: c.prices?.eurFoil ?? null,
});

const draftFromDeck = (deck: Deck): DeckDraft => ({
  id: deck.id,
  name: deck.name,
  format: deck.format,
  visibility: deck.visibility,
  description: deck.description ?? '',
  commanderName: deck.commanderName ?? '',
  cards: deck.cards.map((c) => ({ ...c })),
  categories: deck.categories ?? [],
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
    setCardCategory(state, action: PayloadAction<{ scryfallId: string; category: string | null }>) {
      const card = state.draft.cards.find((c) => c.scryfallId === action.payload.scryfallId);
      if (card) card.category = action.payload.category;
    },
    setCardFoil(state, action: PayloadAction<{ scryfallId: string; foil: boolean }>) {
      const card = state.draft.cards.find((c) => c.scryfallId === action.payload.scryfallId);
      if (card) card.foil = action.payload.foil;
    },
    // Swaps the tracked printing (a different Scryfall id) while keeping qty/category/foil.
    setCardPrinting(state, action: PayloadAction<{ scryfallId: string; printing: ScryfallCard }>) {
      const card = state.draft.cards.find((c) => c.scryfallId === action.payload.scryfallId);
      if (!card) return;
      const p = action.payload.printing;
      // If the target printing is already in the deck, merge quantities instead of colliding on id.
      const collision = state.draft.cards.find((c) => c.scryfallId === p.id && c !== card);
      if (collision) {
        collision.qty += card.qty;
        state.draft.cards = state.draft.cards.filter((c) => c !== card);
        return;
      }
      card.scryfallId = p.id;
      card.imageUrl = p.imageUris?.normal ?? p.imageUris?.small ?? null;
      card.rarity = p.rarity ?? card.rarity;
      card.usd = p.prices?.usd ?? null;
      card.usdFoil = p.prices?.usdFoil ?? null;
      card.eur = p.prices?.eur ?? null;
      card.eurFoil = p.prices?.eurFoil ?? null;
    },
    setCardQty(state, action: PayloadAction<{ scryfallId: string; qty: number }>) {
      const card = state.draft.cards.find((c) => c.scryfallId === action.payload.scryfallId);
      if (!card) return;
      if (action.payload.qty <= 0) {
        state.draft.cards = state.draft.cards.filter((c) => c.scryfallId !== action.payload.scryfallId);
      } else {
        card.qty = action.payload.qty;
      }
    },
    setCategories(state, action: PayloadAction<DeckCategory[]>) {
      state.draft.categories = action.payload;
    },
    addCategory(state, action: PayloadAction<DeckCategory>) {
      if (!state.draft.categories.find((c) => c.name === action.payload.name)) {
        state.draft.categories.push(action.payload);
      }
    },
    removeCategory(state, action: PayloadAction<string>) {
      const name = action.payload;
      state.draft.categories = state.draft.categories.filter((c) => c.name !== name);
      state.draft.cards.forEach((c) => {
        if (c.category === name) c.category = null;
      });
    },
    renameCategory(state, action: PayloadAction<{ oldName: string; newName: string }>) {
      const { oldName, newName } = action.payload;
      const cat = state.draft.categories.find((c) => c.name === oldName);
      if (cat && !state.draft.categories.find((c) => c.name === newName)) {
        cat.name = newName;
        state.draft.cards.forEach((c) => {
          if (c.category === oldName) c.category = newName;
        });
      }
    },
    clearAutocomplete(state) {
      state.autocompleteResults = [];
      state.autocompleteStatus = 'idle';
    },
    setPriceSource(state, action: PayloadAction<PriceSource>) {
      state.priceSource = action.payload;
    },
    setPriceFoil(state, action: PayloadAction<boolean>) {
      state.priceFoil = action.payload;
    },
    resetSaveStatus(state) {
      state.saveStatus = 'idle';
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
      .addCase(autocompleteCards.pending, (s) => {
        s.autocompleteStatus = 'loading';
      })
      .addCase(autocompleteCards.fulfilled, (s, a) => {
        s.autocompleteStatus = 'succeeded';
        s.autocompleteResults = a.payload;
      })
      .addCase(autocompleteCards.rejected, (s) => {
        s.autocompleteStatus = 'failed';
        s.autocompleteResults = [];
      })
      .addCase(saveDraft.pending, (s) => {
        s.saveStatus = 'saving';
      })
      .addCase(saveDraft.fulfilled, (s, a) => {
        s.saveStatus = 'saved';
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
      .addCase(saveDraft.rejected, (s, a) => {
        s.saveStatus = 'error';
        s.error = a.error.message ?? 'Failed to save deck';
      })
      .addCase(deleteDeck.fulfilled, (s, a) => {
        s.myDecks = s.myDecks.filter((d) => d.id !== a.payload);
        if (s.current?.id === a.payload) s.current = null;
      })
      .addCase(likeDeck.fulfilled, (s, a) => { s.current = a.payload; })
      .addCase(unlikeDeck.fulfilled, (s, a) => { s.current = a.payload; })
      .addCase(fetchDeckPrices.pending, (s) => { s.prices = null; })
      .addCase(fetchDeckPrices.fulfilled, (s, a) => { s.prices = a.payload; })
      .addCase(fetchDeckPrices.rejected, (s) => { s.prices = null; })
      .addCase(fetchSuggestions.fulfilled, (s, a) => {
        s.suggestions = a.payload;
      })
      .addCase(fetchCategoryTemplates.fulfilled, (s, a) => {
        s.categoryTemplates = a.payload;
      })
      .addCase(createCategoryTemplate.fulfilled, (s, a) => {
        s.categoryTemplates.unshift(a.payload);
      })
      .addCase(deleteCategoryTemplate.fulfilled, (s, a) => {
        s.categoryTemplates = s.categoryTemplates.filter((t) => t.id !== a.payload);
      });
  },
});

export const {
  newDraft,
  setDraftMeta,
  addCardToDraft,
  changeQty,
  removeCardFromDraft,
  setCardCategory,
  setCardQty,
  setCardFoil,
  setCardPrinting,
  setCategories,
  addCategory,
  removeCategory,
  renameCategory,
  clearAutocomplete,
  resetSaveStatus,
  setPriceSource,
  setPriceFoil,
} = deckSlice.actions;

export default deckSlice.reducer;
