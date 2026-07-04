/**
 * Frontend mirror of the deck-service format master data (backend `Formats.java`) plus a local
 * validator for instant feedback in the builder. The backend `/api/decks/{id}/legality` endpoint
 * is authoritative; this replicates it for the live draft so the UI reacts without a round-trip.
 */

export interface FormatRules {
  format: string;
  label: string;
  minDeckSize: number;
  maxDeckSize: number | null;
  maxCopies: number;
  singleton: boolean;
  requiresCommander: boolean;
  commonsOnly: boolean;
  useRestrictedList: boolean;
}

// Mirrors Formats.java. `/api/decks/formats` returns the authoritative copy; this is the fallback
// and the shape the toolbar/legality panel use.
export const FORMATS: FormatRules[] = [
  { format: 'commander', label: 'Commander', minDeckSize: 100, maxDeckSize: 100, maxCopies: 1, singleton: true, requiresCommander: true, commonsOnly: false, useRestrictedList: false },
  { format: 'standard', label: 'Standard', minDeckSize: 60, maxDeckSize: null, maxCopies: 4, singleton: false, requiresCommander: false, commonsOnly: false, useRestrictedList: false },
  { format: 'pioneer', label: 'Pioneer', minDeckSize: 60, maxDeckSize: null, maxCopies: 4, singleton: false, requiresCommander: false, commonsOnly: false, useRestrictedList: false },
  { format: 'modern', label: 'Modern', minDeckSize: 60, maxDeckSize: null, maxCopies: 4, singleton: false, requiresCommander: false, commonsOnly: false, useRestrictedList: false },
  { format: 'legacy', label: 'Legacy', minDeckSize: 60, maxDeckSize: null, maxCopies: 4, singleton: false, requiresCommander: false, commonsOnly: false, useRestrictedList: false },
  { format: 'vintage', label: 'Vintage', minDeckSize: 60, maxDeckSize: null, maxCopies: 4, singleton: false, requiresCommander: false, commonsOnly: false, useRestrictedList: true },
  { format: 'pauper', label: 'Pauper', minDeckSize: 60, maxDeckSize: null, maxCopies: 4, singleton: false, requiresCommander: false, commonsOnly: true, useRestrictedList: false },
];

const CASUAL: FormatRules = {
  format: 'casual', label: 'Casual', minDeckSize: 0, maxDeckSize: null,
  maxCopies: Number.MAX_SAFE_INTEGER, singleton: false, requiresCommander: false,
  commonsOnly: false, useRestrictedList: false,
};

export const rulesFor = (format?: string): FormatRules =>
  FORMATS.find((f) => f.format === (format ?? '').toLowerCase()) ?? CASUAL;

const BASIC_LANDS = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes']);

export interface CardMeta {
  name: string;
  typeLine: string | null;
  rarity: string | null;
  colorIdentity: string[] | null;
  legalities: Record<string, string> | null;
}

export type ViolationType =
  | 'SIZE' | 'COPIES' | 'BANNED' | 'RESTRICTED' | 'NOT_LEGAL' | 'COLOR_IDENTITY' | 'RARITY'
  | 'COMMANDER';

/**
 * The resolved commander for a commander-format deck (null when the format has no commander).
 * `eligible` is Scryfall's authoritative is:commander verdict (null while unresolved/loading).
 */
export interface CommanderInfo {
  name: string;
  colorIdentity: string[] | null;
  eligible: boolean | null;
}

/**
 * Lenient, offline gate used only to disable the "Set Commander" button for obvious non-commanders
 * without a round-trip: any legendary creature / vehicle / spacecraft / planeswalker, or a card that
 * says it can be your commander. The authoritative verdict is Scryfall's is:commander (see
 * `CommanderInfo.eligible`), which the legality panel uses — this only blocks clear mistakes
 * (instants, artifacts, basics) instantly.
 */
export const canBeCommander = (typeLine: string | null, oracleText: string | null): boolean => {
  const type = (typeLine ?? '').toLowerCase();
  const text = (oracleText ?? '').toLowerCase();
  if (text.includes('can be your commander')) return true;
  if (!type.includes('legendary')) return false;
  return /creature|vehicle|spacecraft|planeswalker/.test(type);
};

export interface Violation {
  type: ViolationType;
  cardName: string | null;
  detail: string;
}

export interface LegalityReport {
  format: string;
  label: string;
  legal: boolean;
  deckSize: number;
  minDeckSize: number;
  maxDeckSize: number | null;
  violations: Violation[];
}

const isBasic = (meta: CardMeta | undefined, name: string): boolean => {
  const type = meta?.typeLine ?? '';
  if (type.toLowerCase().includes('basic')) return true;
  return BASIC_LANDS.has(name.toLowerCase());
};

export interface DraftEntry {
  qty: number;
  name: string;
  meta?: CardMeta;
}

/**
 * Local, best-effort legality check mirroring DeckLegalityService. `commander` is the resolved
 * commander for commander formats (or null to skip commander/identity checks when it can't be
 * resolved client-side yet).
 */
export const evaluateDraft = (
  format: string,
  entries: DraftEntry[],
  commander: CommanderInfo | null = null,
): LegalityReport => {
  const rules = rulesFor(format);
  const deckSize = entries.reduce((sum, e) => sum + e.qty, 0);
  const violations: Violation[] = [];
  const commanderIdentity = commander?.colorIdentity ?? null;

  if (deckSize < rules.minDeckSize) {
    violations.push({ type: 'SIZE', cardName: null, detail: `Deck has ${deckSize} cards; ${rules.label} needs at least ${rules.minDeckSize}` });
  }
  if (rules.maxDeckSize != null && deckSize > rules.maxDeckSize) {
    violations.push({ type: 'SIZE', cardName: null, detail: `Deck has ${deckSize} cards; ${rules.label} allows at most ${rules.maxDeckSize}` });
  }

  if (rules.requiresCommander) {
    const name = commander?.name?.trim() ?? '';
    if (!name) {
      violations.push({ type: 'COMMANDER', cardName: null, detail: 'This format requires a commander' });
    } else if (commander && commander.eligible === false) {
      // Authoritative Scryfall verdict; null (unresolved/loading/offline) skips the check.
      violations.push({ type: 'COMMANDER', cardName: name, detail: "This card can't be a commander" });
    }
  }

  for (const e of entries) {
    const basic = isBasic(e.meta, e.name);
    if (!basic) {
      let max = rules.singleton ? 1 : rules.maxCopies;
      const restricted = rules.useRestrictedList && e.meta?.legalities?.vintage === 'restricted';
      if (restricted) max = 1;
      if (e.qty > max) {
        violations.push({ type: restricted ? 'RESTRICTED' : 'COPIES', cardName: e.name, detail: `${e.qty} copies; max ${max}` });
      }
    }
    const meta = e.meta;
    if (meta) {
      const leg = meta.legalities?.[rules.format];
      if (leg === 'banned') violations.push({ type: 'BANNED', cardName: e.name, detail: `Banned in ${rules.label}` });
      else if (leg === 'not_legal') violations.push({ type: 'NOT_LEGAL', cardName: e.name, detail: `Not legal in ${rules.label}` });
      if (rules.commonsOnly && !basic && meta.rarity && meta.rarity !== 'common') {
        violations.push({ type: 'RARITY', cardName: e.name, detail: `Not common (${meta.rarity})` });
      }
      if (commanderIdentity && meta.colorIdentity && !meta.colorIdentity.every((c) => commanderIdentity.includes(c))) {
        violations.push({ type: 'COLOR_IDENTITY', cardName: e.name, detail: "Outside the commander's colour identity" });
      }
    }
  }

  return {
    format: rules.format,
    label: rules.label,
    legal: violations.length === 0,
    deckSize,
    minDeckSize: rules.minDeckSize,
    maxDeckSize: rules.maxDeckSize,
    violations,
  };
};
