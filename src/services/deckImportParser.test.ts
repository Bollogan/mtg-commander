import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseDeckList, resolveImportLines } from './deckImportParser';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

/** An axios-shaped rejection, so `toApiError` can read the status off it. */
const httpError = (status: number) => Object.assign(new Error(`Request failed with status code ${status}`), {
  isAxiosError: true,
  response: { status, data: {} },
  config: {},
  toJSON: () => ({}),
});

describe('parseDeckList', () => {
  it('parses quantity + name', () => {
    const lines = parseDeckList('4 Lightning Bolt\n1 Sol Ring');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({ raw: '4 Lightning Bolt', qty: 4, name: 'Lightning Bolt', section: 'main' });
    expect(lines[1]).toEqual({ raw: '1 Sol Ring', qty: 1, name: 'Sol Ring', section: 'main' });
  });

  it('parses 1x shorthand', () => {
    const lines = parseDeckList('1x Command Tower');
    expect(lines[0].qty).toBe(1);
    expect(lines[0].name).toBe('Command Tower');
  });

  it('detects commander section', () => {
    const lines = parseDeckList('Commander\n1 Atraxa, Praetors\' Voice\n\nDeck\n1 Sol Ring');
    expect(lines[0].section).toBe('commander');
    expect(lines[1].section).toBe('main');
  });

  it('accepts section headers that carry a card count', () => {
    const lines = parseDeckList('Commander (1)\n1 Atraxa, Praetors\' Voice\nDeck (2)\n1 Sol Ring\nSideboard (1)\n1 Duress');
    expect(lines.map((l) => l.section)).toEqual(['commander', 'main', 'sideboard']);
  });

  it('strips set code, collector number and foil markers', () => {
    const lines = parseDeckList('1 Sol Ring (LTC) 285 *F*\n2 Arcane Signet (ltc) 297\n1x Cultivate [M21] 177 [Ramp]');
    expect(lines.map((l) => l.name)).toEqual(['Sol Ring', 'Arcane Signet', 'Cultivate']);
    expect(lines.map((l) => l.qty)).toEqual([1, 2, 1]);
  });

  it('keeps blank-separated blocks in the main deck', () => {
    // A blank line is not a sideboard marker: Commander exports put the commander on its own
    // line followed by a blank one, and guessing "sideboard" misfiled the whole list.
    const lines = parseDeckList('1 Atraxa, Praetors\' Voice\n\n1 Sol Ring\n1 Command Tower');
    expect(lines.map((l) => l.section)).toEqual(['main', 'main', 'main']);
  });

  it('honours the MTGO per-line sideboard prefix', () => {
    const lines = parseDeckList('1 Mountain\nSB: 2 Smash to Smithereens');
    expect(lines[0].section).toBe('main');
    expect(lines[1]).toMatchObject({ section: 'sideboard', qty: 2, name: 'Smash to Smithereens' });
  });

  it('skips type-bucket headers instead of reading them as cards', () => {
    const lines = parseDeckList('Creatures (2)\n1 Birds of Paradise\n1 Llanowar Elves\nLands (1)\n1 Forest');
    expect(lines.map((l) => l.name)).toEqual(['Birds of Paradise', 'Llanowar Elves', 'Forest']);
  });

  it('skips the Arena About/Name preamble', () => {
    const lines = parseDeckList('About\nName My Deck\n\nDeck\n1 Forest');
    expect(lines).toHaveLength(1);
    expect(lines[0].name).toBe('Forest');
  });

  it('ignores comments and empty lines', () => {
    const lines = parseDeckList('// comment\n\n1 Forest');
    expect(lines).toHaveLength(1);
    expect(lines[0].name).toBe('Forest');
  });
});

describe('resolveImportLines', () => {
  const solRing = {
    id: 'sol',
    name: 'Sol Ring',
    manaCost: '{1}',
    cmc: 1,
    colors: [],
    colorIdentity: [],
    typeLine: 'Artifact',
    oracleText: '',
    imageUris: null,
    setName: '',
    rarity: 'uncommon',
    legalities: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves every line in a single batch request', async () => {
    asMock(apiClient.post).mockResolvedValue({
      data: { resolved: [{ requested: 'Sol Ring', card: solRing }], unresolved: [] },
    });

    const result = await resolveImportLines([
      { raw: '1 Sol Ring', qty: 1, name: 'Sol Ring', section: 'main' },
    ]);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].card.name).toBe('Sol Ring');
    expect(result.errors).toHaveLength(0);
  });

  it('reports the lines the backend could not resolve', async () => {
    asMock(apiClient.post).mockResolvedValue({
      data: { resolved: [{ requested: 'Sol Ring', card: solRing }], unresolved: ['Nonexistent Card'] },
    });
    // The leftover name is retried individually before being reported as unknown.
    asMock(apiClient.get).mockRejectedValue(httpError(404));

    const result = await resolveImportLines([
      { raw: '1 Sol Ring', qty: 1, name: 'Sol Ring', section: 'main' },
      { raw: '1 Nonexistent Card', qty: 1, name: 'Nonexistent Card', section: 'main' },
    ]);

    expect(result.cards).toHaveLength(1);
    expect(result.errors).toEqual(['Could not resolve: 1 Nonexistent Card']);
    expect(result.failure).toBeUndefined();
  });

  it('falls back to per-name lookups when the backend has no bulk endpoint', async () => {
    // A deck-service that predates /cards/named-collection answers 404.
    asMock(apiClient.post).mockRejectedValue(httpError(404));
    asMock(apiClient.get).mockResolvedValue({ data: solRing });

    const result = await resolveImportLines([
      { raw: '1 Sol Ring', qty: 1, name: 'Sol Ring', section: 'main' },
    ]);

    expect(result.cards).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    // `exact` is understood by every version, so it is tried first.
    expect(asMock(apiClient.get).mock.calls[0][1]).toEqual({ params: { exact: 'Sol Ring' } });
  });

  it('verifies individually before blaming the list when the bulk call resolves nothing', async () => {
    asMock(apiClient.post).mockResolvedValue({ data: { resolved: [], unresolved: ['Sol Ring'] } });
    asMock(apiClient.get).mockResolvedValue({ data: solRing });

    const result = await resolveImportLines([
      { raw: '1 Sol Ring', qty: 1, name: 'Sol Ring', section: 'main' },
    ]);

    expect(result.cards).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('flags a whole-request failure instead of listing every line as unknown', async () => {
    asMock(apiClient.post).mockRejectedValue(httpError(500));

    const result = await resolveImportLines([
      { raw: '1 Sol Ring', qty: 1, name: 'Sol Ring', section: 'main' },
      { raw: '1 Island', qty: 1, name: 'Island', section: 'main' },
    ]);

    expect(result.failure).toBe('network');
    expect(result.errors).toHaveLength(0);
    expect(result.cards).toHaveLength(0);
  });

  it('marks the result unavailable when nothing at all could be resolved', async () => {
    asMock(apiClient.post).mockResolvedValue({ data: { resolved: [], unresolved: [] } });
    asMock(apiClient.get).mockRejectedValue(httpError(404));

    const result = await resolveImportLines([
      { raw: '1 Island', qty: 1, name: 'Island', section: 'main' },
    ]);

    expect(result.failure).toBe('unavailable');
  });

  it('looks a double-faced card up by its front face', async () => {
    asMock(apiClient.post).mockRejectedValue(httpError(404));
    asMock(apiClient.get).mockResolvedValue({ data: solRing });

    await resolveImportLines([{
      raw: "1 Kazuul's Fury // Kazuul's Cliffs",
      qty: 1,
      name: "Kazuul's Fury // Kazuul's Cliffs",
      section: 'main',
    }]);

    expect(asMock(apiClient.get).mock.calls[0][1]).toEqual({ params: { exact: "Kazuul's Fury" } });
  });
});
