import type { DeckCard } from '../features/deck/deckSlice';

export type PipColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';
export const PIP_COLORS: PipColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];
export const COLORED_PIPS: PipColor[] = ['W', 'U', 'B', 'R', 'G'];
export const PIP_COLOR_NAMES: Record<PipColor, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless',
};
export const PIP_COLOR_HEX: Record<PipColor, string> = {
  W: '#f5e9c9', U: '#7cc1e6', B: '#9a8fa3', R: '#e08a6f', G: '#7fb389', C: '#b9b0a3',
};

const emptyPips = (): Record<PipColor, number> =>
  ({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 });

/**
 * Parses the coloured/colourless pips of a mana-cost string (e.g. "{2}{W}{U/B}{G/P}").
 * Generic ({2}, {X}) is ignored — it doesn't tie the card to a colour. Hybrid/Phyrexian
 * symbols count toward every colour they can be paid with (matching Archidekt).
 */
export const parsePips = (manaCost: string | null | undefined): Record<PipColor, number> => {
  const pips = emptyPips();
  if (!manaCost) return pips;
  const tokens = manaCost.match(/\{([^}]+)\}/g);
  if (!tokens) return pips;
  for (const raw of tokens) {
    const sym = raw.slice(1, -1).toUpperCase();
    const parts = sym.split('/');
    for (const part of parts) {
      if (part === 'W' || part === 'U' || part === 'B' || part === 'R' || part === 'G' || part === 'C') {
        pips[part as PipColor] += 1;
      }
      // digits, X/Y/Z, P (phyrexian), S (snow) contribute no colour
    }
  }
  return pips;
};

/**
 * Approximates the mana a card can PRODUCE, from its oracle text: for each "Add …" clause,
 * collect the specific mana symbols that follow. "Any colour" production is intentionally
 * NOT counted — like a generic pip, it doesn't tie the card to a colour (it can produce
 * whatever you need), so it must not skew the per-colour percentages.
 */
export const productionPips = (oracleText: string | null | undefined): Record<PipColor, number> => {
  const pips = emptyPips();
  if (!oracleText) return pips;
  // Grab each "Add" clause up to the next sentence break.
  const clauses = oracleText.match(/add\b[^.;\n]*/gi);
  if (!clauses) return pips;
  for (const clause of clauses) {
    // Skip "any colour" / "one mana of any type" producers — they don't commit to a colour.
    if (/any colou?r/i.test(clause) || /mana of any/i.test(clause)) continue;
    const syms = clause.match(/\{([WUBRGC])\}/gi);
    if (!syms) continue;
    for (const s of syms) {
      const c = s.slice(1, -1).toUpperCase() as PipColor;
      pips[c] += 1;
    }
  }
  return pips;
};

export interface ColorPipStat {
  color: PipColor;
  name: string;
  pips: number;   // total pips across all copies
  cards: number;  // number of card copies that contain this pip
  costPct: number; // share of this colour among all coloured pips
}

/** Per-colour pip breakdown for the deck's mana COSTS (copies counted via qty). */
export const costPipStats = (cards: DeckCard[]): ColorPipStat[] => {
  const pipTotals = emptyPips();
  const cardTotals = emptyPips();
  for (const card of cards) {
    const p = parsePips(card.manaCost);
    for (const color of PIP_COLORS) {
      if (p[color] > 0) {
        pipTotals[color] += p[color] * card.qty;
        cardTotals[color] += card.qty;
      }
    }
  }
  const totalColored = COLORED_PIPS.reduce((sum, c) => sum + pipTotals[c], 0);
  return PIP_COLORS.map((color) => ({
    color,
    name: PIP_COLOR_NAMES[color],
    pips: pipTotals[color],
    cards: cardTotals[color],
    costPct: color === 'C' || totalColored === 0 ? 0 : (pipTotals[color] / totalColored) * 100,
  }));
};

/** Per-colour pip breakdown for mana PRODUCTION (from oracle text). */
export const productionPipStats = (cards: DeckCard[]): ColorPipStat[] => {
  const pipTotals = emptyPips();
  const cardTotals = emptyPips();
  for (const card of cards) {
    const p = productionPips(card.oracleText);
    for (const color of PIP_COLORS) {
      if (p[color] > 0) {
        pipTotals[color] += p[color] * card.qty;
        cardTotals[color] += card.qty;
      }
    }
  }
  const totalColored = COLORED_PIPS.reduce((sum, c) => sum + pipTotals[c], 0);
  return PIP_COLORS.map((color) => ({
    color,
    name: PIP_COLOR_NAMES[color],
    pips: pipTotals[color],
    cards: cardTotals[color],
    costPct: color === 'C' || totalColored === 0 ? 0 : (pipTotals[color] / totalColored) * 100,
  }));
};

export const CURVE_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7', '8+'];

const cmcBucket = (cmc: number): string => {
  const n = Math.floor(cmc ?? 0);
  if (n <= 0) return '0';
  return n >= 8 ? '8+' : String(n);
};

const isLand = (typeLine: string | null | undefined): boolean =>
  (typeLine ?? '').toLowerCase().includes('land');

export interface ColorCurve {
  color: PipColor;
  name: string;
  buckets: number[]; // counts per CURVE_BUCKETS index
  total: number;
}

/**
 * Mana curve split by colour (spells only, lands excluded). A multicolour card contributes to
 * each of its colours; colourless spells go to the "C" bucket. All six colours are always
 * returned (even empty) so the UI can render a full, consistent grid.
 */
export const colorCurves = (cards: DeckCard[]): ColorCurve[] => {
  const data: Record<PipColor, number[]> = {
    W: new Array(CURVE_BUCKETS.length).fill(0),
    U: new Array(CURVE_BUCKETS.length).fill(0),
    B: new Array(CURVE_BUCKETS.length).fill(0),
    R: new Array(CURVE_BUCKETS.length).fill(0),
    G: new Array(CURVE_BUCKETS.length).fill(0),
    C: new Array(CURVE_BUCKETS.length).fill(0),
  };
  for (const card of cards) {
    if (isLand(card.typeLine)) continue;
    const idx = CURVE_BUCKETS.indexOf(cmcBucket(card.cmc));
    const colors = (card.colors ?? []).filter((c): c is PipColor => (COLORED_PIPS as string[]).includes(c));
    if (colors.length === 0) {
      data.C[idx] += card.qty;
    } else {
      for (const c of colors) data[c][idx] += card.qty;
    }
  }
  return PIP_COLORS.map((color) => ({
    color,
    name: PIP_COLOR_NAMES[color],
    buckets: data[color],
    total: data[color].reduce((sum, n) => sum + n, 0),
  }));
};
