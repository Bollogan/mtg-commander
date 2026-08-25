import { describe, it, expect } from 'vitest';
import {
  OPENING_HAND_SIZE,
  cardsSeenByTurn,
  isLandCard,
  newGame,
  playtestReducer,
  splitDeck,
  type PlaytestState,
} from './playtestEngine';
import type { Deck, DeckCard } from '../deck/deckSlice';

const card = (name: string, qty: number, typeLine: string, category: string | null = null): DeckCard => ({
  scryfallId: name.toLowerCase().replace(/\s+/g, '-'),
  qty,
  name,
  manaCost: null,
  cmc: 1,
  typeLine,
  colors: null,
  oracleText: null,
  imageUrl: null,
  category,
  foil: false,
  rarity: null,
  colorIdentity: null,
  legalities: null,
  usd: null,
  usdFoil: null,
  eur: null,
  eurFoil: null,
});

const deck = (): Pick<Deck, 'cards' | 'commanderName' | 'format'> => ({
  format: 'commander',
  commanderName: 'Atraxa, Praetors\' Voice',
  cards: [
    card('Atraxa, Praetors\' Voice', 1, 'Legendary Creature — Phyrexian Angel Horror', 'Commander'),
    card('Forest', 20, 'Basic Land — Forest'),
    card('Llanowar Elves', 20, 'Creature — Elf Druid'),
    card('Sideboard Card', 5, 'Instant', 'Sideboard'),
  ],
});

const start = (onThePlay = true) => newGame(deck(), { seed: 12345, onThePlay });

/** Keeps the opening hand, bottoming the mulligan tax first (none on a keep-seven). */
const keep = (state: PlaytestState): PlaytestState => {
  let next = state;
  for (let i = 0; i < state.mulligans; i += 1) {
    next = playtestReducer(next, { type: 'toggleBottomPick', uid: next.zones.hand[i].uid });
  }
  return playtestReducer(next, { type: 'keepHand' });
};

describe('isLandCard', () => {
  it('reads the front face so a spell with a land back is not a land', () => {
    expect(isLandCard('Basic Land — Forest')).toBe(true);
    expect(isLandCard('Sorcery // Land')).toBe(false);
    expect(isLandCard('Land // Land')).toBe(true);
    expect(isLandCard(null)).toBe(false);
  });
});

describe('splitDeck', () => {
  it('starts the commander in the command zone and leaves the sideboard out', () => {
    const { library, command } = splitDeck(deck());
    expect(command).toHaveLength(1);
    expect(command[0].name).toBe('Atraxa, Praetors\' Voice');
    expect(library).toHaveLength(40);
    expect(library.some((c) => c.name === 'Sideboard Card')).toBe(false);
  });
});

describe('newGame', () => {
  it('deals seven and leaves the rest in the library', () => {
    const state = start();
    expect(state.zones.hand).toHaveLength(OPENING_HAND_SIZE);
    expect(state.zones.library).toHaveLength(40 - OPENING_HAND_SIZE);
    expect(state.phase).toBe('mulligan');
    expect(state.turn).toBe(0);
  });

  it('is reproducible for a given seed and different across seeds', () => {
    const a = newGame(deck(), { seed: 99 }).zones.hand.map((c) => c.uid);
    const b = newGame(deck(), { seed: 99 }).zones.hand.map((c) => c.uid);
    const c = newGame(deck(), { seed: 100 }).zones.hand.map((c) => c.uid);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('uses the format starting life', () => {
    expect(start().life).toBe(40);
    expect(newGame({ ...deck(), format: 'modern' }, { seed: 1 }).life).toBe(20);
  });
});

describe('mulligan (London)', () => {
  it('always redraws a full seven and counts the tax', () => {
    const state = playtestReducer(start(), { type: 'mulligan' });
    expect(state.zones.hand).toHaveLength(OPENING_HAND_SIZE);
    expect(state.mulligans).toBe(1);
    expect(state.zones.library).toHaveLength(40 - OPENING_HAND_SIZE);
  });

  it('refuses to keep until exactly the taxed number of cards is chosen', () => {
    const mulled = playtestReducer(start(), { type: 'mulligan' });
    expect(playtestReducer(mulled, { type: 'keepHand' })).toBe(mulled);

    const picked = playtestReducer(mulled, { type: 'toggleBottomPick', uid: mulled.zones.hand[0].uid });
    const kept = playtestReducer(picked, { type: 'keepHand' });
    expect(kept.phase).toBe('playing');
    expect(kept.zones.hand).toHaveLength(6);
    expect(kept.zones.library).toHaveLength(40 - 6);
  });

  it('will not select more cards to bottom than the tax allows', () => {
    const mulled = playtestReducer(start(), { type: 'mulligan' });
    const one = playtestReducer(mulled, { type: 'toggleBottomPick', uid: mulled.zones.hand[0].uid });
    const two = playtestReducer(one, { type: 'toggleBottomPick', uid: one.zones.hand[1].uid });
    expect(two).toBe(one);
  });
});

describe('turns', () => {
  it('does not draw for the first turn on the play', () => {
    const kept = keep(start(true));
    expect(kept.turn).toBe(1);
    expect(kept.zones.hand).toHaveLength(7);
  });

  it('draws for the first turn on the draw', () => {
    const kept = keep(start(false));
    expect(kept.zones.hand).toHaveLength(8);
    expect(kept.cardsDrawn).toBe(8);
  });

  it('untaps the battlefield and draws on each new turn', () => {
    let state = keep(start());
    const land = state.zones.hand.find((c) => c.isLand);
    if (land) {
      state = playtestReducer(state, { type: 'move', uid: land.uid, to: 'battlefield', tapped: true });
      expect(state.zones.battlefield[0].tapped).toBe(true);
    }
    const handBefore = state.zones.hand.length;
    state = playtestReducer(state, { type: 'nextTurn' });

    expect(state.turn).toBe(2);
    expect(state.zones.hand).toHaveLength(handBefore + 1);
    expect(state.zones.battlefield.every((c) => !c.tapped)).toBe(true);
    expect(state.landsPlayedThisTurn).toBe(0);
  });

  it('logs an empty library instead of drawing past it', () => {
    let state = keep(start());
    state = playtestReducer(state, { type: 'draw', count: 500 });
    expect(state.zones.library).toHaveLength(0);
    const before = state.cardsDrawn;
    state = playtestReducer(state, { type: 'draw', count: 1 });
    expect(state.cardsDrawn).toBe(before);
    expect(state.log.at(-1)?.key).toBe('libraryEmpty');
  });
});

describe('moving cards', () => {
  it('counts a land played from hand as this turn\'s land drop', () => {
    let state = keep(start());
    const land = state.zones.hand.find((c) => c.isLand);
    expect(land).toBeDefined();
    state = playtestReducer(state, { type: 'move', uid: land!.uid, to: 'battlefield' });
    expect(state.landsPlayedThisTurn).toBe(1);
    expect(state.zones.hand.some((c) => c.uid === land!.uid)).toBe(false);
  });

  it('clears tapped state and counters when a card leaves the battlefield', () => {
    let state = keep(start());
    const any = state.zones.hand[0];
    state = playtestReducer(state, { type: 'move', uid: any.uid, to: 'battlefield', tapped: true });
    state = playtestReducer(state, { type: 'addCounter', uid: any.uid, delta: 3 });
    expect(state.zones.battlefield[0].counters).toBe(3);

    state = playtestReducer(state, { type: 'move', uid: any.uid, to: 'graveyard' });
    expect(state.zones.graveyard[0].tapped).toBe(false);
    expect(state.zones.graveyard[0].counters).toBe(0);
  });

  it('puts a card back on top of the library when asked', () => {
    let state = keep(start());
    const any = state.zones.hand[0];
    state = playtestReducer(state, { type: 'move', uid: any.uid, to: 'library', position: 'top' });
    expect(state.zones.library[0].uid).toBe(any.uid);
  });

  it('ignores a move for a card that is not in play', () => {
    const state = keep(start());
    expect(playtestReducer(state, { type: 'move', uid: 'nope', to: 'hand' })).toBe(state);
  });
});

describe('cardsSeenByTurn', () => {
  it('counts the opening hand plus one card per draw step', () => {
    expect(cardsSeenByTurn(1, 7, true)).toBe(7);
    expect(cardsSeenByTurn(3, 7, true)).toBe(9);
    expect(cardsSeenByTurn(1, 7, false)).toBe(8);
    expect(cardsSeenByTurn(3, 6, false)).toBe(9);
  });
});
