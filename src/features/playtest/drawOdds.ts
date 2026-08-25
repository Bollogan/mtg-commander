/**
 * Exact draw probabilities for a decklist.
 *
 * Drawing from a deck is sampling without replacement, so the hypergeometric distribution gives
 * the answer outright — no simulation needed, and no sampling error. Everything is computed in
 * log space because a 100-card deck overflows plain factorials long before the answer is wrong.
 */

const LOG_FACTORIAL: number[] = [0, 0];

const logFactorial = (n: number): number => {
  if (n < 0) return Number.NEGATIVE_INFINITY;
  for (let i = LOG_FACTORIAL.length; i <= n; i += 1) {
    LOG_FACTORIAL[i] = LOG_FACTORIAL[i - 1] + Math.log(i);
  }
  return LOG_FACTORIAL[n];
};

const logChoose = (n: number, k: number): number => {
  if (k < 0 || k > n || n < 0) return Number.NEGATIVE_INFINITY;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
};

/**
 * P(exactly `hits` of the `successes` appear in a sample of `sample` cards drawn from a
 * `population`-card deck).
 */
export const hypergeometricPmf = (
  population: number,
  successes: number,
  sample: number,
  hits: number,
): number => {
  if (population <= 0 || sample < 0 || sample > population) return 0;
  if (hits < 0 || hits > successes || hits > sample) return 0;
  if (sample - hits > population - successes) return 0;

  const logP = logChoose(successes, hits)
    + logChoose(population - successes, sample - hits)
    - logChoose(population, sample);
  return Math.exp(logP);
};

/** P(at least `hits` copies in the sample) — the number people actually quote. */
export const hypergeometricAtLeast = (
  population: number,
  successes: number,
  sample: number,
  hits: number,
): number => {
  if (hits <= 0) return 1;
  const max = Math.min(sample, successes);
  let total = 0;
  for (let k = hits; k <= max; k += 1) {
    total += hypergeometricPmf(population, successes, sample, k);
  }
  return Math.min(1, total);
};

/** The full P(exactly k) curve for k = 0…min(sample, successes). */
export const hypergeometricDistribution = (
  population: number,
  successes: number,
  sample: number,
): number[] => {
  const max = Math.min(sample, successes);
  return Array.from({ length: max + 1 }, (_, k) =>
    hypergeometricPmf(population, successes, sample, k));
};

export interface TurnOdds {
  turn: number;
  /** Cards seen by the start of that turn (opening hand plus draw steps). */
  seen: number;
  probability: number;
}

export interface OddsByTurnOptions {
  /** Cards left in the deck when the opening hand is dealt (i.e. decklist minus command zone). */
  deckSize: number;
  /** How many cards in the deck count as a hit (copies of a card, total lands, …). */
  copies: number;
  handSize?: number;
  onThePlay?: boolean;
  atLeast?: number;
  maxTurn?: number;
}

/**
 * Chance of having seen at least `atLeast` copies by the start of each turn — the table that
 * answers "will this deck actually have three lands on turn three?".
 */
export const oddsByTurn = ({
  deckSize,
  copies,
  handSize = 7,
  onThePlay = true,
  atLeast = 1,
  maxTurn = 10,
}: OddsByTurnOptions): TurnOdds[] =>
  Array.from({ length: maxTurn }, (_, i) => {
    const turn = i + 1;
    // Turn 1 is just the opening hand on the play; on the draw it adds that turn's draw step.
    const seen = Math.min(deckSize, handSize + (turn - 1) + (onThePlay ? 0 : 1));
    return { turn, seen, probability: hypergeometricAtLeast(deckSize, copies, seen, atLeast) };
  });

export interface HandCountOdds {
  count: number;
  probability: number;
}

/** P(exactly N of the tracked cards in the opening hand), for the land-count histogram. */
export const openingHandDistribution = (
  deckSize: number,
  copies: number,
  handSize = 7,
): HandCountOdds[] =>
  hypergeometricDistribution(deckSize, copies, handSize)
    .map((probability, count) => ({ count, probability }));

/**
 * Probability the opening hand holds between `min` and `max` of the tracked cards — the usual
 * proxy for "is this hand keepable" when the tracked cards are lands.
 */
export const openingHandInRange = (
  deckSize: number,
  copies: number,
  min: number,
  max: number,
  handSize = 7,
): number => {
  let total = 0;
  for (let k = min; k <= Math.min(max, handSize, copies); k += 1) {
    total += hypergeometricPmf(deckSize, copies, handSize, k);
  }
  return Math.min(1, total);
};

export const formatPercent = (probability: number, digits = 1): string =>
  `${(probability * 100).toFixed(digits)}%`;
