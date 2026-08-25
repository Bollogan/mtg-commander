import { describe, it, expect } from 'vitest';
import {
  hypergeometricAtLeast,
  hypergeometricDistribution,
  hypergeometricPmf,
  oddsByTurn,
  openingHandInRange,
} from './drawOdds';

describe('hypergeometric draw odds', () => {
  it('matches the textbook "4-of in an opening hand" figure', () => {
    // A 4-of in 60 cards is seen in an opening seven 39.9% of the time.
    expect(hypergeometricAtLeast(60, 4, 7, 1)).toBeCloseTo(0.3995, 4);
  });

  it('matches a singleton in a 99-card Commander deck', () => {
    // With one copy the answer collapses to sample/deck = 7/99.
    expect(hypergeometricAtLeast(99, 1, 7, 1)).toBeCloseTo(7 / 99, 6);
  });

  it('computes the chance of a landless opening hand', () => {
    expect(hypergeometricPmf(60, 24, 7, 0)).toBeCloseTo(0.0216, 4);
  });

  it('produces a distribution that sums to one', () => {
    const total = hypergeometricDistribution(99, 38, 7).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('returns impossible outcomes as zero', () => {
    expect(hypergeometricPmf(60, 4, 7, 5)).toBe(0);
    expect(hypergeometricPmf(60, 24, 7, 8)).toBe(0);
    expect(hypergeometricAtLeast(60, 4, 7, 0)).toBe(1);
  });

  it('stays accurate on large populations where factorials would overflow', () => {
    // 1000!/… overflows a double outright; the log-space form still answers.
    // Mean hits = 40, sd ≈ 4.6, so "at least 30" sits a little over two sigma out.
    const p = hypergeometricAtLeast(1000, 400, 100, 30);
    expect(p).toBeCloseTo(0.989, 3);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe('oddsByTurn', () => {
  it('counts the opening hand only on turn one when on the play', () => {
    const rows = oddsByTurn({ deckSize: 99, copies: 38, handSize: 7, onThePlay: true, maxTurn: 3 });
    expect(rows.map((r) => r.seen)).toEqual([7, 8, 9]);
  });

  it('adds the extra card on the draw', () => {
    const rows = oddsByTurn({ deckSize: 99, copies: 38, handSize: 7, onThePlay: false, maxTurn: 3 });
    expect(rows.map((r) => r.seen)).toEqual([8, 9, 10]);
  });

  it('is monotonically increasing across turns', () => {
    const rows = oddsByTurn({ deckSize: 99, copies: 1, maxTurn: 10 });
    const probabilities = rows.map((r) => r.probability);
    expect(probabilities).toEqual([...probabilities].sort((a, b) => a - b));
  });

  it('never claims to see more cards than the deck holds', () => {
    const rows = oddsByTurn({ deckSize: 10, copies: 4, handSize: 7, maxTurn: 10 });
    expect(rows.at(-1)?.seen).toBe(10);
    expect(rows.at(-1)?.probability).toBe(1);
  });
});

describe('openingHandInRange', () => {
  it('reports the keepable-land window of a 17-land limited deck', () => {
    const keepable = openingHandInRange(40, 17, 2, 5, 7);
    expect(keepable).toBeGreaterThan(0.85);
    expect(keepable).toBeLessThan(1);
  });

  it('sums to one across the whole possible range', () => {
    expect(openingHandInRange(99, 38, 0, 7, 7)).toBeCloseTo(1, 10);
  });
});
