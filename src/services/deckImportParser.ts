import { apiClient } from '../api/client';
import { toApiError } from '../api/apiError';
import type { ScryfallCard } from '../features/deck/deckSlice';

export type ImportSection = 'commander' | 'main' | 'sideboard' | 'companion' | 'maybeboard';

export interface ImportLine {
  raw: string;
  qty: number;
  name: string;
  section: ImportSection;
}

export interface ImportResult {
  cards: { card: ScryfallCard; qty: number; section: ImportSection }[];
  /** One entry per decklist line that matched no card. */
  errors: string[];
  /**
   * Set when the import failed as a whole rather than line by line: `network` if the request
   * never completed, `unavailable` if it completed but resolved nothing. Both mean "the card
   * database could not be reached", not "these card names are wrong".
   */
  failure?: 'network' | 'unavailable';
}

/**
 * Section headers written by the exporters people actually paste from (MTG Arena, Moxfield,
 * Archidekt, MTGO, TappedOut). Matched after the trailing card count that most of them append
 * ("Commander (1)", "Deck (99)") has been stripped.
 */
const SECTION_HEADERS: Record<string, ImportSection> = {
  commander: 'commander',
  commanders: 'commander',
  edh: 'commander',
  general: 'commander',
  deck: 'main',
  decklist: 'main',
  'main deck': 'main',
  main: 'main',
  maindeck: 'main',
  mainboard: 'main',
  sideboard: 'sideboard',
  'side board': 'sideboard',
  sb: 'sideboard',
  companion: 'companion',
  maybeboard: 'maybeboard',
  considering: 'maybeboard',
};

/** Metadata lines emitted by exporters that are not cards and not section headers. */
const METADATA_LINES = new Set(['about', 'tokens', 'token']);

/** MTG Arena writes the deck's own name as "Name <deck name>" in its `About` block. */
const DECK_NAME_LINE = /^name\s+\S/i;

/**
 * A grouping header rather than a card: no leading quantity and a parenthesised count, which is
 * how Archidekt/TappedOut label type buckets ("Creatures (31)", "Ramp (10)"). The cards under it
 * stay in whatever section is active, so an unknown bucket name never becomes a phantom card.
 */
const GROUP_HEADER = /^[^\d].*\(\d+\)\s*$/;

/** MTGO-style per-line sideboard marker: "SB: 2 Lightning Bolt". */
const SB_PREFIX = /^sb:\s*/i;

/**
 * Quantity + name, with the printing metadata exporters append: a set code in parentheses or
 * brackets, a collector number, a foil marker, and Archidekt's `[Category]` tag.
 * "1 Sol Ring (LTC) 285 *F* [Ramp]" → qty 1, name "Sol Ring".
 */
const CARD_LINE = /^(?:(\d+)\s*[xX]?\s+)?(.+?)\s*$/;

/** Everything an exporter can glue after the card name. Stripped from the right, repeatedly. */
const TRAILING_METADATA = [
  /\s*\*[^*]*\*\s*$/,           // *F*, *E* (foil / etched markers)
  /\s*\[[^\]]*\]\s*$/,          // [LTC], [Ramp] (set code or category tag)
  /\s*\([^)]*\)\s*$/,           // (LTC), (Commander 2021)
  /\s*<[^>]*>\s*$/,             // <foil>
  /\s*\^[^^]*\^\s*$/,           // ^Have,#ff0000^ (Archidekt collection flags)
  /\s+[#]?\d{1,4}[a-z]?\s*$/i,  // trailing collector number (285, 285a, #285)
  /\s*[,|]\s*$/,                // stray separator
];

const stripTrailingMetadata = (value: string): string => {
  let name = value.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of TRAILING_METADATA) {
      const stripped = name.replace(pattern, '').trim();
      // Never strip everything away: a card genuinely named "(One)" must survive.
      if (stripped && stripped !== name) {
        name = stripped;
        changed = true;
      }
    }
  }
  return name;
};

/** A header line, ignoring the trailing count and colon that exporters add. */
const isSectionHeader = (line: string): ImportSection | null => {
  const normalized = line
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/[:：]\s*$/, '')
    .trim()
    .toLowerCase();
  return SECTION_HEADERS[normalized] ?? null;
};

const parseCardLine = (line: string, section: ImportSection): ImportLine | null => {
  const match = line.match(CARD_LINE);
  if (!match) return null;

  const name = stripTrailingMetadata(match[2]);
  if (!name) return null;

  const qty = match[1] ? parseInt(match[1], 10) : 1;
  if (!Number.isFinite(qty) || qty <= 0) return null;

  return { raw: line, qty, name, section };
};

/**
 * Parses a pasted decklist into quantity/name/section triples.
 *
 * Cards only leave the main deck when an explicit section header (or an `SB:` prefix) says so.
 * A blank line is *not* treated as a sideboard separator: Commander exports routinely put the
 * commander on its own line followed by a blank one, and guessing "sideboard" there silently
 * misfiled the entire decklist.
 */
export const parseDeckList = (text: string): ImportLine[] => {
  const result: ImportLine[] = [];
  let currentSection: ImportSection = 'main';
  let sawSectionHeader = false;

  for (const rawLine of text.split(/\r?\n/)) {
    // Some exporters use non-breaking spaces, which break the quantity match.
    const trimmed = rawLine.replace(/\u00A0/g, ' ').trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue;
    }
    if (METADATA_LINES.has(trimmed.toLowerCase())) {
      continue;
    }
    // "Name My Deck" is the deck's own title, which Arena writes in the preamble.
    if (!sawSectionHeader && DECK_NAME_LINE.test(trimmed)) {
      continue;
    }

    const section = isSectionHeader(trimmed);
    if (section) {
      currentSection = section;
      sawSectionHeader = true;
      continue;
    }
    if (GROUP_HEADER.test(trimmed)) {
      continue;
    }

    const sideboardLine = SB_PREFIX.test(trimmed);
    const parsed = parseCardLine(
      sideboardLine ? trimmed.replace(SB_PREFIX, '') : trimmed,
      sideboardLine ? 'sideboard' : currentSection,
    );
    if (parsed) {
      result.push({ ...parsed, raw: rawLine.trim() });
    }
  }

  return result;
};

interface ResolvedNamesResponse {
  resolved: { requested: string; card: ScryfallCard }[];
  unresolved: string[];
}

const BULK_ENDPOINT = '/api/decks/cards/named-collection';
const NAMED_ENDPOINT = '/api/decks/cards/named';
const FALLBACK_CONCURRENCY = 4;
/**
 * Scryfall asks for no more than ~10 requests a second. The fallback fires one request per card,
 * so it paces itself globally: workers queue on this slot allocator rather than racing, which
 * keeps a 100-card import from being rate-limited into failing the very import it is rescuing.
 */
const MIN_REQUEST_SPACING_MS = 120;
let nextRequestSlot = 0;

const takeRequestSlot = async (): Promise<void> => {
  const now = Date.now();
  const start = Math.max(now, nextRequestSlot);
  nextRequestSlot = start + MIN_REQUEST_SPACING_MS;
  if (start > now) {
    await new Promise((resolve) => setTimeout(resolve, start - now));
  }
};

/** Scryfall matches a double-faced card by its front face, which is what exports abbreviate to. */
const frontFace = (name: string): string => {
  const split = name.indexOf('//');
  return split > 0 ? name.slice(0, split).trim() || name : name;
};

/** Resolves the whole list in one request. Rejects if the endpoint is unavailable. */
const resolveInBulk = async (names: string[]): Promise<Map<string, ScryfallCard>> => {
  const { data } = await apiClient.post<ResolvedNamesResponse>(BULK_ENDPOINT, { names });
  const byName = new Map<string, ScryfallCard>();
  for (const entry of data?.resolved ?? []) {
    byName.set(entry.requested.toLowerCase(), entry.card);
  }
  return byName;
};

/** One name, trying the exact match first and falling back to Scryfall's fuzzy matcher. */
const lookupOne = async (name: string): Promise<ScryfallCard | null> => {
  const query = frontFace(name);
  for (const params of [{ exact: query }, { fuzzy: query }]) {
    try {
      await takeRequestSlot();
      const { data } = await apiClient.get<ScryfallCard>(NAMED_ENDPOINT, { params });
      if (data?.id) return data;
    } catch {
      // 404 means this strategy found nothing; 400 means this deck-service does not support
      // the parameter. Either way, try the next one.
    }
  }
  return null;
};

/**
 * One request per name, a few at a time. This is the safety net for a backend that has no bulk
 * endpoint (or whose bulk endpoint answered but resolved nothing): `exact` is understood by
 * every version of deck-service, so the import still completes.
 */
const resolveIndividually = async (names: string[]): Promise<Map<string, ScryfallCard>> => {
  const byName = new Map<string, ScryfallCard>();
  const queue = [...names];

  const worker = async () => {
    for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
      const card = await lookupOne(name);
      if (card) byName.set(name.toLowerCase(), card);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(FALLBACK_CONCURRENCY, names.length) }, worker),
  );
  return byName;
};

/**
 * Resolves every parsed line against Scryfall, preferring the single bulk round trip and
 * degrading to per-name lookups when that is not an option.
 *
 * The degradation matters: an import run against a deck-service that predates the bulk endpoint
 * would otherwise report every single line as an unknown card, which reads as "your decklist is
 * wrong" when the real problem is on our side.
 */
export const resolveImportLines = async (lines: ImportLine[]): Promise<ImportResult> => {
  if (lines.length === 0) {
    return { cards: [], errors: [] };
  }

  const names = [...new Set(lines.map((line) => line.name))];

  let byName: Map<string, ScryfallCard>;
  try {
    byName = await resolveInBulk(names);
  } catch (error) {
    const { status } = toApiError(error);
    // 404/405 = this backend has no bulk endpoint yet. Anything else is a genuine failure.
    if (status !== 404 && status !== 405) {
      return { cards: [], errors: [], failure: 'network' };
    }
    byName = await resolveIndividually(names);
  }

  // The bulk call answered but matched nothing. A hundred simultaneously-invalid card names is
  // far less likely than a backend or proxy problem, so verify before blaming the decklist.
  if (byName.size === 0) {
    byName = await resolveIndividually(names);
  }

  const cards: ImportResult['cards'] = [];
  const errors: string[] = [];
  for (const line of lines) {
    const card = byName.get(line.name.toLowerCase());
    if (card) {
      cards.push({ card, qty: line.qty, section: line.section });
    } else {
      errors.push(`Could not resolve: ${line.raw}`);
    }
  }

  return { cards, errors, failure: cards.length === 0 ? 'unavailable' : undefined };
};
