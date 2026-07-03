import { describe, it, expect } from 'vitest';
import { autoCategory, groupCards, sortCards } from './deckView';
import type { DeckCard, DeckCategory } from '../../features/deck/deckSlice';

const card = (name: string, type: string, cmc: number, qty: number, category?: string): DeckCard => ({
  scryfallId: name,
  name,
  qty,
  cmc,
  typeLine: type,
  manaCost: null,
  colors: [],
  colorIdentity: [],
  oracleText: null,
  imageUrl: null,
  rarity: 'common',
  legalities: null,
  category: category ?? null,
  foil: false,
  usd: null,
  usdFoil: null,
  eur: null,
  eurFoil: null,
});

describe('autoCategory', () => {
  it('classifies creatures', () => {
    expect(autoCategory(card('Bear', 'Creature — Bear', 2, 1))).toBe('Creature');
  });

  it('classifies lands', () => {
    expect(autoCategory(card('Forest', 'Basic Land — Forest', 0, 1))).toBe('Land');
  });

  it('classifies instants', () => {
    expect(autoCategory(card('Bolt', 'Instant', 1, 1))).toBe('Instant');
  });
});

describe('groupCards', () => {
  it('groups by type in canonical order', () => {
    const cards = [card('Forest', 'Basic Land — Forest', 0, 1), card('Bear', 'Creature — Bear', 2, 1)];
    const groups = groupCards(cards, 'type', 'name');
    expect(groups.map((g) => g.key)).toEqual(['Creature', 'Land']);
  });

  it('groups by custom category first', () => {
    const categories: DeckCategory[] = [{ name: 'Ramp', color: null, icon: null, order: 0 }];
    const cards = [
      card('Cultivate', 'Sorcery', 2, 1, 'Ramp'),
      card('Forest', 'Basic Land — Forest', 0, 1),
    ];
    const groups = groupCards(cards, 'category', 'name', categories);
    expect(groups.map((g) => g.key)).toEqual(['Ramp', 'Land']);
  });

  it('sums quantities in count', () => {
    const cards = [card('Bear', 'Creature — Bear', 2, 3)];
    const groups = groupCards(cards, 'type', 'name');
    expect(groups[0].count).toBe(3);
  });
});

describe('sortCards', () => {
  it('sorts by name', () => {
    const cards = [card('Zebra', 'Creature', 2, 1), card('Apple', 'Creature', 2, 1)];
    const sorted = sortCards(cards, 'name');
    expect(sorted.map((c) => c.name)).toEqual(['Apple', 'Zebra']);
  });
});
