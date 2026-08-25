import type { Deck, DeckCard } from '../deck/deckSlice';

/**
 * Solo "goldfish" playtest engine — the model behind Archidekt's playtester: no opponents, no
 * server, no rules enforcement. It exists to rehearse the opening turns (the ones that decide
 * most games) and to see what the deck actually draws.
 *
 * Everything here is pure: `playtestReducer` takes a state and an action and returns the next
 * state, which is what makes undo a plain history stack and the whole thing unit-testable.
 */

export type PlaytestZone = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'command';

export const ZONES: PlaytestZone[] = [
  'library', 'hand', 'battlefield', 'graveyard', 'exile', 'command',
];

/** One physical copy of a card. A deck entry with qty 4 becomes four of these. */
export interface PlaytestCard {
  /** Stable per copy, so React keys and moves survive shuffles. */
  uid: string;
  scryfallId: string;
  name: string;
  imageUrl: string | null;
  typeLine: string | null;
  manaCost: string | null;
  cmc: number;
  isLand: boolean;
  /** Battlefield-only state, kept on the card so it survives zone changes cleanly. */
  tapped: boolean;
  counters: number;
  faceDown: boolean;
}

/**
 * A log line. `key` names an i18n entry under `playtest.log.*` and `params` fills it, so the
 * engine stays language-agnostic while the panel renders in the user's language.
 */
export interface LogEntry {
  id: number;
  turn: number;
  key: string;
  params?: Record<string, string | number>;
}

export type PlaytestPhase = 'mulligan' | 'playing';

export interface PlaytestState {
  seed: number;
  /** 0 while deciding the opening hand; 1+ once it is kept. */
  turn: number;
  onThePlay: boolean;
  phase: PlaytestPhase;
  /** How many mulligans were taken — the London rule bottoms this many cards on keep. */
  mulligans: number;
  /** Cards the player picked to put on the bottom when keeping. */
  bottomPicks: string[];
  zones: Record<PlaytestZone, PlaytestCard[]>;
  landsPlayedThisTurn: number;
  /** Totals for the "this game" column of the odds panel. */
  cardsDrawn: number;
  landsDrawn: number;
  life: number;
  log: LogEntry[];
  nextLogId: number;
}

export const OPENING_HAND_SIZE = 7;

// ── Randomness ───────────────────────────────────────────────────────────────

/**
 * Small deterministic PRNG. Seeding the shuffle is what lets "restart with the same hand"
 * reproduce a game exactly, which is the whole point of testing a specific opening.
 */
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Fisher–Yates against a seeded generator; returns a new array. */
export const shuffleWith = <T,>(items: T[], random: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);

// ── Deck → cards ─────────────────────────────────────────────────────────────

/** Card types are read off the front face, so "Sorcery // Land" is not treated as a land. */
export const isLandCard = (typeLine: string | null | undefined): boolean =>
  (typeLine ?? '').split('//')[0].toLowerCase().includes('land');

const COMMAND_ZONE_CATEGORIES = new Set(['commander', 'companion']);
const EXCLUDED_CATEGORIES = new Set(['sideboard', 'maybeboard']);

const toCopies = (card: DeckCard): PlaytestCard[] =>
  Array.from({ length: Math.max(1, card.qty) }, (_, i) => ({
    uid: `${card.scryfallId}#${i}`,
    scryfallId: card.scryfallId,
    name: card.name,
    imageUrl: card.imageUrl,
    typeLine: card.typeLine,
    manaCost: card.manaCost,
    cmc: card.cmc ?? 0,
    isLand: isLandCard(card.typeLine),
    tapped: false,
    counters: 0,
    faceDown: false,
  }));

/**
 * Splits a deck into the library and the command zone. Commander/companion entries and the
 * deck's named commander start in the command zone; sideboard and maybeboard stay out of the
 * game entirely.
 */
export const splitDeck = (deck: Pick<Deck, 'cards' | 'commanderName'>) => {
  const library: PlaytestCard[] = [];
  const command: PlaytestCard[] = [];

  for (const card of deck.cards) {
    const category = (card.category ?? '').toLowerCase();
    if (EXCLUDED_CATEGORIES.has(category)) continue;

    const isCommander = COMMAND_ZONE_CATEGORIES.has(category)
      || (deck.commanderName != null && card.name === deck.commanderName);
    (isCommander ? command : library).push(...toCopies(card));
  }
  return { library, command };
};

// ── State ────────────────────────────────────────────────────────────────────

const emptyZones = (): Record<PlaytestZone, PlaytestCard[]> => ({
  library: [], hand: [], battlefield: [], graveyard: [], exile: [], command: [],
});

interface NewGameOptions {
  seed?: number;
  onThePlay?: boolean;
  /** Reuse the previous life total etc. is not wanted — a new game always starts clean. */
  startingLife?: number;
}

/**
 * Deals a fresh game: shuffle, draw the opening seven, and stop in the mulligan phase so the
 * hand can be kept or thrown back before the first turn begins.
 */
export const newGame = (
  deck: Pick<Deck, 'cards' | 'commanderName' | 'format'>,
  options: NewGameOptions = {},
): PlaytestState => {
  const seed = options.seed ?? randomSeed();
  const { library, command } = splitDeck(deck);
  const shuffled = shuffleWith(library, mulberry32(seed));

  const zones = emptyZones();
  zones.command = command;
  zones.hand = shuffled.slice(0, OPENING_HAND_SIZE);
  zones.library = shuffled.slice(OPENING_HAND_SIZE);

  return {
    seed,
    turn: 0,
    onThePlay: options.onThePlay ?? true,
    phase: 'mulligan',
    mulligans: 0,
    bottomPicks: [],
    zones,
    landsPlayedThisTurn: 0,
    cardsDrawn: 0,
    landsDrawn: 0,
    life: options.startingLife ?? (deck.format === 'commander' ? 40 : 20),
    log: [{ id: 1, turn: 0, key: 'newGame', params: { seed } }],
    nextLogId: 2,
  };
};

export type PlaytestAction =
  | { type: 'mulligan' }
  | { type: 'toggleBottomPick'; uid: string }
  | { type: 'keepHand' }
  | { type: 'nextTurn' }
  | { type: 'draw'; count?: number }
  | { type: 'mill'; count: number }
  | { type: 'move'; uid: string; to: PlaytestZone; position?: 'top' | 'bottom'; tapped?: boolean }
  | { type: 'toggleTap'; uid: string }
  | { type: 'untapAll' }
  | { type: 'addCounter'; uid: string; delta: number }
  | { type: 'toggleFaceDown'; uid: string }
  | { type: 'shuffleLibrary' }
  | { type: 'adjustLife'; delta: number };

// ── Helpers ──────────────────────────────────────────────────────────────────

const clone = (state: PlaytestState): PlaytestState => ({
  ...state,
  bottomPicks: [...state.bottomPicks],
  zones: {
    library: [...state.zones.library],
    hand: [...state.zones.hand],
    battlefield: [...state.zones.battlefield],
    graveyard: [...state.zones.graveyard],
    exile: [...state.zones.exile],
    command: [...state.zones.command],
  },
  log: [...state.log],
});

const log = (state: PlaytestState, key: string, params?: Record<string, string | number>) => {
  state.log.push({ id: state.nextLogId, turn: state.turn, key, params });
  state.nextLogId += 1;
};

const findZoneOf = (state: PlaytestState, uid: string): PlaytestZone | null =>
  ZONES.find((zone) => state.zones[zone].some((c) => c.uid === uid)) ?? null;

/** Moves the top `count` cards of the library into `to`, returning what actually moved. */
const drawInto = (state: PlaytestState, count: number, to: PlaytestZone): PlaytestCard[] => {
  const moved = state.zones.library.slice(0, Math.max(0, count));
  state.zones.library = state.zones.library.slice(moved.length);
  state.zones[to] = [...state.zones[to], ...moved];
  return moved;
};

// ── Reducer ──────────────────────────────────────────────────────────────────

export const playtestReducer = (state: PlaytestState, action: PlaytestAction): PlaytestState => {
  const next = clone(state);

  switch (action.type) {
    case 'mulligan': {
      // London mulligan: always draw a fresh seven; the cost is paid when keeping.
      const all = [...next.zones.library, ...next.zones.hand];
      const shuffled = shuffleWith(all, mulberry32(next.seed + next.mulligans + 1));
      next.mulligans += 1;
      next.bottomPicks = [];
      next.zones.hand = shuffled.slice(0, OPENING_HAND_SIZE);
      next.zones.library = shuffled.slice(OPENING_HAND_SIZE);
      log(next, 'mulligan', { count: next.mulligans });
      return next;
    }

    case 'toggleBottomPick': {
      if (next.phase !== 'mulligan') return state;
      const picked = next.bottomPicks.includes(action.uid);
      if (picked) {
        next.bottomPicks = next.bottomPicks.filter((uid) => uid !== action.uid);
      } else if (next.bottomPicks.length < next.mulligans) {
        next.bottomPicks = [...next.bottomPicks, action.uid];
      } else {
        return state; // already picked enough
      }
      return next;
    }

    case 'keepHand': {
      if (next.phase !== 'mulligan') return state;
      if (next.bottomPicks.length !== next.mulligans) return state;

      const bottomed = next.zones.hand.filter((c) => next.bottomPicks.includes(c.uid));
      next.zones.hand = next.zones.hand.filter((c) => !next.bottomPicks.includes(c.uid));
      next.zones.library = [...next.zones.library, ...bottomed];
      next.bottomPicks = [];
      next.phase = 'playing';
      next.turn = 1;
      next.cardsDrawn = next.zones.hand.length;
      next.landsDrawn = next.zones.hand.filter((c) => c.isLand).length;
      log(next, 'keep', { handSize: next.zones.hand.length, bottomed: bottomed.length });
      log(next, 'turn', { turn: 1 });
      // On the draw you also draw for the first turn.
      if (!next.onThePlay) {
        const drawn = drawInto(next, 1, 'hand');
        next.cardsDrawn += drawn.length;
        next.landsDrawn += drawn.filter((c) => c.isLand).length;
        log(next, 'draw', { count: drawn.length });
      }
      return next;
    }

    case 'nextTurn': {
      if (next.phase !== 'playing') return state;
      next.turn += 1;
      next.landsPlayedThisTurn = 0;
      next.zones.battlefield = next.zones.battlefield.map((c) => ({ ...c, tapped: false }));
      log(next, 'turn', { turn: next.turn });
      const drawn = drawInto(next, 1, 'hand');
      next.cardsDrawn += drawn.length;
      next.landsDrawn += drawn.filter((c) => c.isLand).length;
      log(next, drawn.length ? 'draw' : 'libraryEmpty', { count: drawn.length });
      return next;
    }

    case 'draw': {
      const drawn = drawInto(next, action.count ?? 1, 'hand');
      next.cardsDrawn += drawn.length;
      next.landsDrawn += drawn.filter((c) => c.isLand).length;
      log(next, drawn.length ? 'draw' : 'libraryEmpty', { count: drawn.length });
      return next;
    }

    case 'mill': {
      const milled = drawInto(next, action.count, 'graveyard');
      log(next, 'mill', { count: milled.length });
      return next;
    }

    case 'move': {
      const from = findZoneOf(next, action.uid);
      if (!from) return state;
      const card = next.zones[from].find((c) => c.uid === action.uid);
      if (!card) return state;

      next.zones[from] = next.zones[from].filter((c) => c.uid !== action.uid);
      // Leaving the battlefield wipes the physical state that only exists there.
      const moved: PlaytestCard = action.to === 'battlefield'
        ? { ...card, tapped: action.tapped ?? false }
        : { ...card, tapped: false, counters: 0, faceDown: false };

      next.zones[action.to] = action.position === 'top'
        ? [moved, ...next.zones[action.to]]
        : [...next.zones[action.to], moved];

      if (action.to === 'battlefield' && card.isLand && from === 'hand') {
        next.landsPlayedThisTurn += 1;
      }
      log(next, 'move', { name: card.name, from, to: action.to });
      return next;
    }

    case 'toggleTap': {
      next.zones.battlefield = next.zones.battlefield.map((c) =>
        (c.uid === action.uid ? { ...c, tapped: !c.tapped } : c));
      return next;
    }

    case 'untapAll': {
      next.zones.battlefield = next.zones.battlefield.map((c) => ({ ...c, tapped: false }));
      log(next, 'untapAll');
      return next;
    }

    case 'addCounter': {
      next.zones.battlefield = next.zones.battlefield.map((c) =>
        (c.uid === action.uid ? { ...c, counters: Math.max(0, c.counters + action.delta) } : c));
      return next;
    }

    case 'toggleFaceDown': {
      next.zones.battlefield = next.zones.battlefield.map((c) =>
        (c.uid === action.uid ? { ...c, faceDown: !c.faceDown } : c));
      return next;
    }

    case 'shuffleLibrary': {
      next.zones.library = shuffleWith(next.zones.library, mulberry32(next.seed + next.nextLogId));
      log(next, 'shuffle');
      return next;
    }

    case 'adjustLife': {
      next.life += action.delta;
      log(next, 'life', { life: next.life });
      return next;
    }

    default:
      return state;
  }
};

// ── Derived helpers used by the UI ───────────────────────────────────────────

/**
 * How many cards the player has seen by the start of `turn`, given the opening hand size and
 * who is on the play. This is the sample size the draw-odds table is computed against.
 */
export const cardsSeenByTurn = (turn: number, handSize: number, onThePlay: boolean): number =>
  handSize + Math.max(0, turn - 1) + (onThePlay ? 0 : Math.min(1, Math.max(0, turn)));

/** Mana value histogram of a zone, for the board summary. */
export const manaValueSpread = (cards: PlaytestCard[]): Record<number, number> => {
  const spread: Record<number, number> = {};
  for (const card of cards) {
    if (card.isLand) continue;
    const cmc = Math.min(7, Math.floor(card.cmc));
    spread[cmc] = (spread[cmc] ?? 0) + 1;
  }
  return spread;
};
