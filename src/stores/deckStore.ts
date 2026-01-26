import { create } from 'zustand';
import type { Card } from '../types/cardType';

export interface DeckCard {
  card: Card;
  quantity: number;
  category?: string;
  //tags: string[];
}

interface Deck {
  id: string;
  name: string;
  commander?: DeckCard;
  main: DeckCard[];
  sideboard: DeckCard[];
  maybeboard: DeckCard[];
  //tags: Record<string, string[]>;
}

interface DeckState {
  decks: Deck[];
  currentDeckId: string | null;
  createDeck: (name: string) => void;
  switchDeck: (id: string) => void;
  addCard: (
    card: Card,
    quantity?: number,
    category?: 'commander' | 'main' | 'sideboard' | 'maybeboard'
  ) => void;
  removeCard: (cardName: string, category?: 'commander' | 'main' | 'sideboard' | 'maybeboard') => void;
  updateQuantity: (
    cardName: string,
    quantity: number,
    category?: 'commander' | 'main' | 'sideboard' | 'maybeboard'
  ) => void;
  //addTag: (cardName: string, tag: string) => void;
}

export const useDeckStore = create<DeckState>((set, get) => ({
  decks: [],
  currentDeckId: null,

  createDeck: (name) => set((state) => {
    const newId = crypto.randomUUID?.() || Date.now().toString();
    const newDeck: Deck = {
      id: newId,
      name,
      commander: undefined,
      main: [],
      sideboard: [],
      maybeboard: [],
    };
    return {
      decks: [...state.decks, newDeck],
      currentDeckId: newId,
    };
  }),

  switchDeck: (id) => set({ currentDeckId: id }),

  addCard: (card, quantity = 1, category = 'main') => set((state) => {
    if (!state.currentDeckId) return state;

    const decks = [...state.decks];
    const deckIndex = decks.findIndex((d) => d.id === state.currentDeckId);
    if (deckIndex === -1) return state;

    const deck = { ...decks[deckIndex] };

    if (category === 'commander') {
      // Solo permitimos 1 comandante
      deck.commander = { card, quantity: 1 };
    } else {
      // Para main, sideboard, maybeboard → arrays
      const targetArray = deck[category] as DeckCard[]; // Type assertion segura
      const existingIndex = targetArray.findIndex(
        (entry) => entry.card.name.toLowerCase() === card.name.toLowerCase()
      );

      if (existingIndex !== -1) {
        targetArray[existingIndex] = {
          ...targetArray[existingIndex],
          quantity: targetArray[existingIndex].quantity + quantity,
        };
      } else {
        targetArray.push({ card, quantity });
      }
    }

    decks[deckIndex] = deck;
    return { decks };
  }),

  removeCard: (cardName, category = 'main') => set((state) => {
    if (!state.currentDeckId) return state;

    const decks = [...state.decks];
    const deckIndex = decks.findIndex((d) => d.id === state.currentDeckId);
    if (deckIndex === -1) return state;

    const deck = { ...decks[deckIndex] };

    if (category === 'commander') {
      deck.commander = undefined;
    } else {
      const targetArray = deck[category] as DeckCard[];
      deck[category] = targetArray.filter(
        (entry) => entry.card.name.toLowerCase() !== cardName.toLowerCase()
      );
    }

    decks[deckIndex] = deck;
    return { decks };
  }),

  updateQuantity: (cardName, quantity, category = 'main') => set((state) => {
    if (!state.currentDeckId || quantity < 0) return state;

    const decks = [...state.decks];
    const deckIndex = decks.findIndex((d) => d.id === state.currentDeckId);
    if (deckIndex === -1) return state;

    const deck = { ...decks[deckIndex] };

    if (category === 'commander') {
      if (quantity === 0) {
        deck.commander = undefined;
      } else if (deck.commander?.card.name.toLowerCase() === cardName.toLowerCase()) {
        deck.commander.quantity = 1; // Comandante siempre 1
      }
    } else {
      const targetArray = deck[category] as DeckCard[];
      const entry = targetArray.find(
        (e) => e.card.name.toLowerCase() === cardName.toLowerCase()
      );

      if (entry) {
        if (quantity === 0) {
          deck[category] = targetArray.filter(
            (e) => e.card.name.toLowerCase() !== cardName.toLowerCase()
          );
        } else {
          entry.quantity = quantity;
        }
      }
    }

    decks[deckIndex] = deck;
    return { decks };
  }),

  // addTag: ... (lo implementamos cuando lo necesites)
}));