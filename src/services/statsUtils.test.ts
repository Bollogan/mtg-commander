import { describe, it, expect } from 'vitest';
import { hyperProbability } from './hypergeometric';
import { parsePips, costPipStats, colorCurves, productionPips } from './manaStats';
import type { DeckCard } from '../features/deck/deckSlice';

const card = (over: Partial<DeckCard>): DeckCard => ({
  scryfallId: over.scryfallId ?? Math.random().toString(36).slice(2),
  qty: over.qty ?? 1,
  name: over.name ?? 'X',
  manaCost: over.manaCost ?? null,
  cmc: over.cmc ?? 0,
  typeLine: over.typeLine ?? 'Creature',
  colors: over.colors ?? null,
  oracleText: over.oracleText ?? null,
  imageUrl: null,
  category: null,
  foil: over.foil ?? false,
  rarity: null,
  colorIdentity: null,
  legalities: null,
  usd: null,
  usdFoil: null,
  eur: null,
  eurFoil: null,
});

describe('hypergeometric', () => {
  it('P(at least 1 land in opening 7 of a 99-card deck with 37 lands) ≈ 97%', () => {
    const p = hyperProbability(99, 37, 7, 1, 'atLeast');
    expect(Math.round(p * 100)).toBe(97);
  });
  it('exactly matches a trivial case', () => {
    // 1 copy in a 1-card deck, draw 1 → exactly 1 is certain
    expect(hyperProbability(1, 1, 1, 1, 'exactly')).toBeCloseTo(1, 6);
  });
  it('at most 0 = complement of at least 1', () => {
    const atMost0 = hyperProbability(40, 10, 7, 0, 'atMost');
    const atLeast1 = hyperProbability(40, 10, 7, 1, 'atLeast');
    expect(atMost0 + atLeast1).toBeCloseTo(1, 6);
  });
  it('never exceeds 1 or drops below 0', () => {
    expect(hyperProbability(60, 60, 7, 1, 'atLeast')).toBeCloseTo(1, 6);
    expect(hyperProbability(60, 0, 7, 1, 'atLeast')).toBe(0);
  });
});

describe('parsePips', () => {
  it('counts coloured pips and ignores generic', () => {
    expect(parsePips('{2}{U}{U}{R}')).toMatchObject({ U: 2, R: 1, W: 0, B: 0, G: 0, C: 0 });
  });
  it('counts hybrid toward both colours and phyrexian toward its colour', () => {
    expect(parsePips('{W/U}{G/P}')).toMatchObject({ W: 1, U: 1, G: 1 });
  });
  it('counts {C} as colourless, {X} as nothing', () => {
    expect(parsePips('{X}{C}{C}')).toMatchObject({ C: 2, W: 0 });
  });
});

describe('productionPips', () => {
  it('counts specific produced mana symbols', () => {
    expect(productionPips('{T}: Add {G}{G}.')).toMatchObject({ G: 2, W: 0 });
  });
  it('does NOT count "any colour" producers (they do not commit to a colour)', () => {
    expect(productionPips('{T}: Add one mana of any color.')).toMatchObject({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 });
  });
  it('counts only the Add clause, not other symbols in the text', () => {
    expect(productionPips('{2}{U}: Draw a card. {T}: Add {U}.')).toMatchObject({ U: 1 });
  });
});

describe('costPipStats', () => {
  it('splits coloured pip share between colours and excludes generic from %', () => {
    const cards = [
      card({ manaCost: '{U}{U}', qty: 2 }), // 4 blue pips over 2 copies
      card({ manaCost: '{2}{R}', qty: 2 }), // 2 red pips over 2 copies
    ];
    const stats = costPipStats(cards);
    const blue = stats.find((s) => s.color === 'U')!;
    const red = stats.find((s) => s.color === 'R')!;
    expect(blue.pips).toBe(4);
    expect(blue.cards).toBe(2);
    expect(red.pips).toBe(2);
    // 4 of 6 coloured pips are blue → 67%
    expect(Math.round(blue.costPct)).toBe(67);
    expect(Math.round(red.costPct)).toBe(33);
  });
});

describe('colorCurves', () => {
  it('always returns all six colours and buckets multicolour into each', () => {
    const curves = colorCurves([card({ colors: ['U', 'R'], cmc: 2, typeLine: 'Instant' })]);
    expect(curves.map((c) => c.color)).toEqual(['W', 'U', 'B', 'R', 'G', 'C']);
    const u = curves.find((c) => c.color === 'U')!;
    const r = curves.find((c) => c.color === 'R')!;
    expect(u.buckets[2]).toBe(1); // bucket index 2 = MV 2
    expect(r.buckets[2]).toBe(1);
  });
  it('excludes lands and buckets colourless spells into C', () => {
    const curves = colorCurves([
      card({ colors: [], cmc: 3, typeLine: 'Artifact' }),
      card({ colors: ['G'], cmc: 5, typeLine: 'Land' }), // land ignored
    ]);
    expect(curves.find((c) => c.color === 'C')!.buckets[3]).toBe(1);
    expect(curves.find((c) => c.color === 'G')!.total).toBe(0);
  });
});
