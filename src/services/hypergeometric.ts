/**
 * Hypergeometric probabilities for the "chance to draw" calculator.
 * Uses log-factorials so large binomials (deck sizes up to ~100+, any hand size) don't overflow.
 */

const logFactCache: number[] = [0, 0];
const logFactorial = (n: number): number => {
  if (n < 0) return NaN;
  for (let i = logFactCache.length; i <= n; i++) {
    logFactCache[i] = logFactCache[i - 1] + Math.log(i);
  }
  return logFactCache[n];
};

/** ln( C(n, k) ). Returns -Infinity for impossible combinations. */
const logChoose = (n: number, k: number): number => {
  if (k < 0 || k > n || n < 0) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
};

/**
 * P(X = x) drawing `draws` cards from a deck of `population` that contains `successes` copies
 * of the wanted card/category.
 */
export const hyperPMF = (population: number, successes: number, draws: number, x: number): number => {
  if (x < 0 || x > successes || draws - x > population - successes || draws > population) return 0;
  const logP = logChoose(successes, x) + logChoose(population - successes, draws - x) - logChoose(population, draws);
  return Number.isFinite(logP) ? Math.exp(logP) : 0;
};

export type DrawMode = 'atLeast' | 'exactly' | 'atMost';

/** Probability of drawing `mode` `x` successes in `draws` cards. Result in [0, 1]. */
export const hyperProbability = (
  population: number,
  successes: number,
  draws: number,
  x: number,
  mode: DrawMode,
): number => {
  if (population <= 0 || draws <= 0) return 0;
  const capDraws = Math.min(draws, population);
  const maxHits = Math.min(successes, capDraws);
  let total = 0;
  if (mode === 'exactly') {
    return clamp01(hyperPMF(population, successes, capDraws, x));
  }
  if (mode === 'atLeast') {
    for (let i = Math.max(0, x); i <= maxHits; i++) total += hyperPMF(population, successes, capDraws, i);
  } else {
    // atMost
    for (let i = 0; i <= Math.min(x, maxHits); i++) total += hyperPMF(population, successes, capDraws, i);
  }
  return clamp01(total);
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
