import { describe, expect, it } from 'vitest';
import { canBeCommander, evaluateDraft, type CommanderInfo, type DraftEntry } from './formats';

const eligibleCommander: CommanderInfo = { name: 'Gruul Commander', colorIdentity: ['R', 'G'], eligible: true };
const ineligibleCommander: CommanderInfo = { name: 'Sol Ring', colorIdentity: [], eligible: false };
const loadingCommander: CommanderInfo = { name: 'Some Card', colorIdentity: null, eligible: null };

const violationTypes = (format: string, entries: DraftEntry[], commander: CommanderInfo | null) =>
  evaluateDraft(format, entries, commander).violations.map((v) => v.type);

describe('canBeCommander (offline button gate)', () => {
  it('accepts legendary creatures', () => {
    expect(canBeCommander('Legendary Creature — Elf Warrior', '')).toBe(true);
  });
  it('accepts legendary vehicles (e.g. Shorikai)', () => {
    expect(canBeCommander('Legendary Artifact — Vehicle', '{1}, {T}: Draw two cards…')).toBe(true);
  });
  it('accepts cards that say they can be your commander', () => {
    expect(canBeCommander('Legendary Planeswalker — Freyalise', 'Freyalise can be your commander.')).toBe(true);
  });
  it('rejects non-legendary cards and obvious non-commanders', () => {
    expect(canBeCommander('Artifact', '{T}: Add {C}.')).toBe(false);
    expect(canBeCommander('Creature — Goblin', '')).toBe(false);
    expect(canBeCommander('Instant', 'Draw a card.')).toBe(false);
    expect(canBeCommander(null, null)).toBe(false);
  });
});

describe('evaluateDraft commander rules', () => {
  it('flags a missing commander in commander format', () => {
    expect(violationTypes('commander', [], null)).toContain('COMMANDER');
  });

  it('flags a commander Scryfall says is ineligible', () => {
    expect(violationTypes('commander', [], ineligibleCommander)).toContain('COMMANDER');
  });

  it('accepts an eligible commander', () => {
    expect(violationTypes('commander', [], eligibleCommander)).not.toContain('COMMANDER');
  });

  it('does not judge eligibility while unresolved (eligible = null)', () => {
    expect(violationTypes('commander', [], loadingCommander)).not.toContain('COMMANDER');
  });

  it('does not require a commander in non-commander formats', () => {
    expect(violationTypes('modern', [], null)).not.toContain('COMMANDER');
  });

  it('flags cards outside the commander colour identity', () => {
    const entries: DraftEntry[] = [
      { qty: 1, name: 'Blue Spell', meta: { name: 'Blue Spell', typeLine: 'Instant', rarity: 'common', colorIdentity: ['U'], legalities: { commander: 'legal' } } },
    ];
    expect(violationTypes('commander', entries, eligibleCommander)).toContain('COLOR_IDENTITY');
  });
});
