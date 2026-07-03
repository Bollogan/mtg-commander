import type { DeckCard } from '../features/deck/deckSlice';

/**
 * EDH/Commander functional categories inspired by Archidekt's auto-categories.
 * These are best-effort heuristics based on oracle text; they will miss some
 * cards and occasionally misclassify others. They improve over time by tuning.
 */

export const FUNCTIONAL_CATEGORIES = [
  'Ramp',
  'Draw',
  'Removal',
  'Board Wipe',
  'Counterspell',
  'Protection',
  'Recursion',
  'Tutor',
  'Token',
  'Lifegain',
  'Graveyard',
  'Landfall',
  'Theft',
  'Clone',
  'Sac Outlet',
  'Mana Rock',
  'Mana Dork',
  'Cost Reduction',
  'Bombs',
];

const lower = (s: string | null | undefined): string => (s ?? '').toLowerCase();

export const suggestCategories = (card: DeckCard): string[] => {
  const text = lower(card.oracleText);
  const type = lower(card.typeLine);
  const cats: string[] = [];

  if (type.includes('land')) {
    cats.push('Land');
    return cats;
  }

  // Counterspells
  if (text.includes('counter target spell') || text.includes('counter target activated') || text.includes('counter target triggered')) {
    cats.push('Counterspell');
  }

  // Board wipes
  if (
    text.includes('destroy all') ||
    text.includes('exile all') ||
    text.includes('each creature') ||
    text.includes('all creatures') ||
    text.includes('each artifact') ||
    text.includes('each enchantment')
  ) {
    cats.push('Board Wipe');
  }

  // Removal (single target)
  if (
    text.includes('destroy target') ||
    text.includes('exile target') ||
    text.includes('damage to target') ||
    /-\d+\/\-\d+/.test(text) ||
    text.includes('fight target') ||
    text.includes('fight another') ||
    text.includes('return target') ||
    (text.includes('enchant') && text.includes('loses all abilities'))
  ) {
    cats.push('Removal');
  }

  // Draw
  if (
    text.includes('draw a card') ||
    text.includes('draws a card') ||
    text.includes('draw two cards') ||
    text.includes('draw x cards') ||
    text.includes('draw cards equal')
  ) {
    cats.push('Draw');
  }

  // Ramp / mana production
  const isManaProducer =
    text.includes('search your library for a land') ||
    text.includes('put a land card') ||
    text.includes('additional land') ||
    text.includes('land card from your library') ||
    text.includes('add one mana of any color') ||
    text.includes('add two mana') ||
    text.includes('add three mana') ||
    text.includes('add {c}{c}') ||
    text.includes('treasure token');

  if (isManaProducer) {
    if (type.includes('creature')) cats.push('Mana Dork');
    else if (type.includes('artifact')) cats.push('Mana Rock');
    else cats.push('Ramp');
  }

  // Tutors
  if (text.includes('search your library for') && text.includes('reveal')) {
    cats.push('Tutor');
  }

  // Recursion / graveyard value
  if (
    (text.includes('return') && text.includes('from your graveyard')) ||
    text.includes('reanimate') ||
    text.includes('reanimation') ||
    (text.includes('graveyard') && text.includes('hand'))
  ) {
    cats.push('Recursion');
  }

  // Graveyard synergy (mill / fill)
  if (
    text.includes('mill') ||
    text.includes('put the top') ||
    (text.includes('discard') && text.includes('card'))
  ) {
    cats.push('Graveyard');
  }

  // Protection
  if (
    text.includes('protection') ||
    text.includes('hexproof') ||
    text.includes('indestructible') ||
    text.includes('shroud') ||
    text.includes('prevent all damage') ||
    text.includes("can't lose") ||
    text.includes('fog')
  ) {
    cats.push('Protection');
  }

  // Tokens
  if (text.includes('create') && text.includes('token')) {
    cats.push('Token');
  }

  // Lifegain
  if (text.includes('gain life') || text.includes('gains life')) {
    cats.push('Lifegain');
  }

  // Landfall
  if (text.includes('landfall')) {
    cats.push('Landfall');
  }

  // Theft / control
  if (text.includes('gain control') || text.includes('take control') || text.includes('exchange control')) {
    cats.push('Theft');
  }

  // Clones
  if (text.includes('as a copy of') || text.includes('enter the battlefield as a copy')) {
    cats.push('Clone');
  }

  // Sac outlet
  if (
    (text.includes('sacrifice a creature') || text.includes('sacrifice another creature')) &&
    text.includes(':')
  ) {
    cats.push('Sac Outlet');
  }

  // Cost reduction
  if (text.includes('cost') && text.includes('less') && text.includes('spells')) {
    cats.push('Cost Reduction');
  }

  // Bombs / finishers
  if ((card.cmc ?? 0) >= 6 && (type.includes('creature') || type.includes('planeswalker'))) {
    cats.push('Bombs');
  }

  return [...new Set(cats)];
};
