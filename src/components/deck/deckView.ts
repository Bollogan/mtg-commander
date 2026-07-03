import type { DeckCard, DeckCategory } from '../../features/deck/deckSlice';
import type { CardMeta } from '../../data/formats';
import { suggestCategories } from '../../services/cardCategorizer';

export type ViewMode = 'stacks' | 'grid' | 'text' | 'table';
export type GroupBy = 'category' | 'type' | 'cmc' | 'color' | 'rarity';
export type SortBy = 'name' | 'cmc' | 'rarity' | 'qty';
export type ImageSize = 'sm' | 'md' | 'lg';

// Primary card type → bucket, in the canonical display order used by Archidekt-style stacks.
const TYPE_ORDER = [
  'Commander', 'Planeswalker', 'Creature', 'Sorcery', 'Instant',
  'Artifact', 'Enchantment', 'Battle', 'Land', 'Other',
];

/** Derives a card's default category from oracle text heuristics, falling back to type line. */
export const autoCategory = (card: DeckCard): string => {
  const functional = suggestCategories(card);
  const first = functional.find((c) => c !== 'Land');
  if (first) return first;

  const type = (card.typeLine ?? '').toLowerCase();
  if (type.includes('planeswalker')) return 'Planeswalker';
  if (type.includes('creature')) return 'Creature';
  if (type.includes('land')) return 'Land';
  if (type.includes('sorcery')) return 'Sorcery';
  if (type.includes('instant')) return 'Instant';
  if (type.includes('artifact')) return 'Artifact';
  if (type.includes('enchantment')) return 'Enchantment';
  if (type.includes('battle')) return 'Battle';
  return 'Other';
};

const COLOR_NAMES: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green',
};

const colorGroup = (card: DeckCard): string => {
  const colors = card.colors ?? [];
  if ((card.typeLine ?? '').toLowerCase().includes('land')) return 'Lands';
  if (colors.length === 0) return 'Colorless';
  if (colors.length > 1) return 'Multicolor';
  return COLOR_NAMES[colors[0]] ?? colors[0];
};

const cmcGroup = (card: DeckCard): string => {
  if ((card.typeLine ?? '').toLowerCase().includes('land')) return 'Lands';
  const cmc = Math.floor(card.cmc ?? 0);
  return cmc >= 7 ? '7+' : String(cmc);
};

const categoryGroup = (card: DeckCard, categories: DeckCategory[]): string => {
  if (card.category) return card.category;
  const auto = autoCategory(card);
  // If the deck has a custom category matching an auto-category name, use that name.
  if (categories.some((c) => c.name === auto)) return auto;
  return auto;
};

// Real card types (from the type line), in display priority. A card is bucketed by the first
// match, so "Artifact Creature" → Creature and any land → Land.
const CARD_TYPES = ['Land', 'Creature', 'Planeswalker', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Battle'];

/** Groups a card by its actual card type (not functional categories). */
export const cardTypeGroup = (card: DeckCard): string => {
  const type = (card.typeLine ?? '').toLowerCase();
  return CARD_TYPES.find((t) => type.includes(t.toLowerCase())) ?? 'Other';
};

const groupKey = (card: DeckCard, groupBy: GroupBy, categories: DeckCategory[]): string => {
  switch (groupBy) {
    case 'category': return categoryGroup(card, categories);
    case 'type': return cardTypeGroup(card);
    case 'cmc': return cmcGroup(card);
    case 'color': return colorGroup(card);
    case 'rarity': return card.rarity ? card.rarity[0].toUpperCase() + card.rarity.slice(1) : 'Unknown';
  }
};

const RARITY_ORDER = ['Mythic', 'Rare', 'Uncommon', 'Common', 'Special', 'Bonus', 'Unknown'];

/** Orders group headers sensibly per grouping (type order, numeric CMC, rarity order, else A→Z). */
const orderGroupKeys = (keys: string[], groupBy: GroupBy, categories: DeckCategory[]): string[] => {
  const idx = (list: string[], k: string) => {
    const i = list.indexOf(k);
    return i === -1 ? list.length : i;
  };
  const sorted = [...keys];
  if (groupBy === 'category') {
    const customNames = categories.map((c) => c.name);
    sorted.sort((a, b) => {
      const customA = customNames.indexOf(a);
      const customB = customNames.indexOf(b);
      if (customA !== -1 && customB !== -1) return customA - customB;
      if (customA !== -1) return -1;
      if (customB !== -1) return 1;
      return idx(TYPE_ORDER, a) - idx(TYPE_ORDER, b) || a.localeCompare(b);
    });
  } else if (groupBy === 'type') {
    sorted.sort((a, b) => idx(TYPE_ORDER, a) - idx(TYPE_ORDER, b) || a.localeCompare(b));
  } else if (groupBy === 'cmc') {
    const val = (k: string) => (k === 'Lands' ? 999 : k === '7+' ? 7 : Number(k));
    sorted.sort((a, b) => val(a) - val(b));
  } else if (groupBy === 'rarity') {
    sorted.sort((a, b) => idx(RARITY_ORDER, a) - idx(RARITY_ORDER, b));
  } else {
    sorted.sort((a, b) => a.localeCompare(b));
  }
  return sorted;
};

export const sortCards = (cards: DeckCard[], sortBy: SortBy): DeckCard[] => {
  const copy = [...cards];
  switch (sortBy) {
    case 'name': copy.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'cmc': copy.sort((a, b) => (a.cmc ?? 0) - (b.cmc ?? 0) || a.name.localeCompare(b.name)); break;
    case 'qty': copy.sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name)); break;
    case 'rarity': {
      const rank = (r: string | null) =>
        RARITY_ORDER.indexOf(r ? r[0].toUpperCase() + r.slice(1) : 'Unknown');
      copy.sort((a, b) => rank(a.rarity) - rank(b.rarity) || a.name.localeCompare(b.name));
      break;
    }
  }
  return copy;
};

export interface CardGroup {
  key: string;
  cards: DeckCard[];
  count: number; // total copies in the group
}

/** Groups + sorts the draft cards for any view. */
export const groupCards = (
  cards: DeckCard[],
  groupBy: GroupBy,
  sortBy: SortBy,
  categories: DeckCategory[] = [],
  commanderCard?: DeckCard | null,
): CardGroup[] => {
  const map = new Map<string, DeckCard[]>();
  for (const card of cards) {
    const key = groupKey(card, groupBy, categories);
    (map.get(key) ?? map.set(key, []).get(key)!).push(card);
  }
  const ordered = orderGroupKeys([...map.keys()], groupBy, categories).map((key) => {
    const groupCardsList = sortCards(map.get(key)!, sortBy);
    return {
      key,
      cards: groupCardsList,
      count: groupCardsList.reduce((sum, c) => sum + c.qty, 0),
    };
  });

  if (commanderCard && groupBy === 'category') {
    ordered.unshift({
      key: 'Commander',
      cards: [commanderCard],
      count: 1,
    });
  }
  return ordered;
};

/** Adapts a DeckCard into the CardMeta shape the legality evaluator expects. */
export const cardMeta = (card: DeckCard): CardMeta => ({
  name: card.name,
  typeLine: card.typeLine,
  rarity: card.rarity,
  colorIdentity: card.colorIdentity,
  legalities: card.legalities,
});

/** Converts a full Scryfall card into the DeckCard shape used by the views. */
export const toViewCard = (card: { id: string; name: string; manaCost?: string | null; cmc?: number; typeLine?: string | null; colors?: string[] | null; colorIdentity?: string[] | null; oracleText?: string | null; imageUris?: { normal?: string | null; small?: string | null } | null; rarity?: string | null; legalities?: Record<string, string> | null }, qty = 1, category: string | null = null): DeckCard => ({
  scryfallId: card.id,
  qty,
  name: card.name,
  manaCost: card.manaCost ?? null,
  cmc: card.cmc ?? 0,
  typeLine: card.typeLine ?? null,
  colors: card.colors ?? null,
  oracleText: card.oracleText ?? null,
  imageUrl: card.imageUris?.normal ?? card.imageUris?.small ?? null,
  category,
  foil: false,
  rarity: card.rarity ?? null,
  colorIdentity: card.colorIdentity ?? null,
  legalities: card.legalities ?? null,
  usd: null,
  usdFoil: null,
  eur: null,
  eurFoil: null,
});

export type PriceSource = 'usd' | 'eur';
export const PRICE_SYMBOL: Record<PriceSource, string> = { usd: '$', eur: '€' };

/**
 * A single card's price in the selected source. Uses the foil price when the global foil toggle
 * is on OR the card itself is tracked as foil, falling back to the non-foil price if unavailable.
 */
export const cardPrice = (card: DeckCard, source: PriceSource, foil: boolean): number | null => {
  const useFoil = foil || card.foil;
  if (source === 'usd') return useFoil ? (card.usdFoil ?? card.usd) : card.usd;
  return useFoil ? (card.eurFoil ?? card.eur) : card.eur;
};

/** Sum of a group's card prices (price × qty), null when no card in the group is priced. */
export const groupPrice = (cards: DeckCard[], source: PriceSource, foil: boolean): number | null => {
  let sum = 0;
  let any = false;
  for (const c of cards) {
    const p = cardPrice(c, source, foil);
    if (p != null) { sum += p * c.qty; any = true; }
  }
  return any ? sum : null;
};

export const IMAGE_WIDTHS: Record<ImageSize, number> = { sm: 170, md: 240, lg: 320 };
