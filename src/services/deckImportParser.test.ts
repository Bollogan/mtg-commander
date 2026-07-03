import { describe, it, expect, vi } from 'vitest';
import { parseDeckList, resolveImportLines } from './deckImportParser';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

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

  it('detects sideboard by blank line', () => {
    const lines = parseDeckList('1 Mountain\n\n2 Smash to Smithereens');
    expect(lines[0].section).toBe('main');
    expect(lines[1].section).toBe('sideboard');
  });

  it('ignores comments and empty lines', () => {
    const lines = parseDeckList('// comment\n\n1 Forest');
    expect(lines).toHaveLength(1);
    expect(lines[0].name).toBe('Forest');
  });
});

describe('resolveImportLines', () => {
  it('resolves names via fuzzy search', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
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
      },
    });

    const result = await resolveImportLines([{ raw: '1 Sol Ring', qty: 1, name: 'Sol Ring', section: 'main' }]);

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].card.name).toBe('Sol Ring');
    expect(result.errors).toHaveLength(0);
  });
});
