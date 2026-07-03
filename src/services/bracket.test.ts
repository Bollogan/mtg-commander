import { describe, it, expect } from 'vitest';
import { estimateBracket } from './bracket';
import type { DeckCard } from '../features/deck/deckSlice';

const card = (over: Partial<DeckCard>): DeckCard => ({
  scryfallId: over.scryfallId ?? Math.random().toString(36).slice(2),
  qty: over.qty ?? 1,
  name: over.name ?? 'Grizzly Bears',
  manaCost: over.manaCost ?? null,
  cmc: over.cmc ?? 2,
  typeLine: over.typeLine ?? 'Creature',
  colors: over.colors ?? null,
  oracleText: over.oracleText ?? null,
  imageUrl: null,
  category: null,
  foil: false,
  rarity: null,
  colorIdentity: null,
  legalities: null,
  usd: null,
  usdFoil: null,
  eur: null,
  eurFoil: null,
});

describe('estimateBracket', () => {
  it('returns null for an empty deck', () => {
    expect(estimateBracket([])).toBeNull();
  });

  it('a clean casual deck is bracket 2 (Core)', () => {
    const r = estimateBracket([card({ name: 'Grizzly Bears' }), card({ name: 'Llanowar Elves' })])!;
    expect(r.bracket).toBe(2);
    expect(r.reasons.map((x) => x.code)).toContain('clean');
  });

  it('one Game Changer pushes to bracket 3 (Upgraded)', () => {
    const r = estimateBracket([card({ name: 'Rhystic Study' }), card({ name: 'Grizzly Bears' })])!;
    expect(r.bracket).toBe(3);
    expect(r.gameChangers).toContain('Rhystic Study');
  });

  it('four+ Game Changers or mass land denial → bracket 4 (Optimized)', () => {
    const r = estimateBracket([
      card({ name: 'Rhystic Study' }),
      card({ name: 'Cyclonic Rift' }),
      card({ name: 'Smothering Tithe' }),
      card({ name: 'Mana Vault' }),
    ])!;
    expect(r.bracket).toBe(4);
  });

  it('detects a 2-card infinite combo and flags bracket 4', () => {
    const r = estimateBracket([
      card({ name: "Thassa's Oracle" }),
      card({ name: 'Demonic Consultation' }),
    ])!;
    expect(r.bracket).toBe(4);
    expect(r.combos.length).toBe(1);
  });

  it('flags mass land denial by oracle text', () => {
    const r = estimateBracket([card({ name: 'Some Wrath', typeLine: 'Sorcery', oracleText: 'Destroy all lands.' })])!;
    expect(r.massLandDenial.length).toBe(1);
    expect(r.bracket).toBe(4);
  });

  it('does not count basic-land ramp as an efficient tutor', () => {
    const r = estimateBracket([
      card({ name: 'Cultivate', typeLine: 'Sorcery', oracleText: 'Search your library for up to two basic land cards.' }),
    ])!;
    expect(r.tutors.length).toBe(0);
  });
});
