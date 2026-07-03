import type { DeckCard } from '../features/deck/deckSlice';

/**
 * Local estimate of a Commander deck's WotC "bracket" (1–5), plus the reasons behind it.
 *
 * This is a heuristic mirror of the official Commander Brackets criteria — Game Changers,
 * mass land denial, chained extra turns, extensive tutoring and 2-card infinite combos.
 * It never contacts the network: everything is derived from the cards' names and oracle text.
 * Bracket 5 (cEDH) is a metagame call and is not auto-assigned; a clean deck defaults to 2.
 */

const norm = (s: string) => s.trim().toLowerCase();

// Official Game Changers list (representative set). Presence of these is the strongest signal.
const GAME_CHANGERS = new Set([
  'ancient tomb', 'chrome mox', 'mox diamond', 'grim monolith', 'jeweled lotus', 'mana vault',
  'the one ring', "gaea's cradle", "serra's sanctum", 'vampiric tutor', 'demonic tutor',
  'enlightened tutor', 'grim tutor', 'imperial seal', 'mystical tutor', 'tainted pact',
  'cyclonic rift', 'fierce guardianship', 'deflecting swat', 'rhystic study', 'mystic remora',
  'smothering tithe', 'necropotence', 'sylvan library', 'trouble in pairs', 'aura shards',
  "bolas's citadel", 'opposition agent', 'consecrated sphinx', 'drannith magistrate',
  'grand arbiter augustin iv', "thassa's oracle", 'underworld breach', "yuriko, the tiger's shadow",
  'kinnan, bonder prodigy', 'winota, joiner of forces', 'notion thief', 'narset, parter of veils',
  'braids, cabal minion', 'gifts ungiven', 'coalition victory', 'panoptic mirror',
  'emrakul, the aeons torn', 'expropriate', 'jin-gitaxias, core augur', 'craterhoof behemoth',
  'ad nauseam', 'seedborn muse', 'food chain', 'glacial chasm', "lion's eye diamond",
  'field of the dead', 'nadu, winged wisdom', 'sway of the stars', 'the tabernacle at pendrell vale',
].map(norm));

// Mass land denial — resets or locks that deny most players their lands.
const MASS_LAND_DENIAL = new Set([
  'armageddon', 'ravages of war', 'catastrophe', 'cataclysm', 'decree of annihilation',
  'jokulhaups', 'obliterate', 'devastation', 'impending disaster', 'sunder', 'wildfire',
  'fall of the thran', 'winter orb', 'static orb', 'stasis', 'rising waters', 'contamination',
  'root maze', 'storm cauldron', 'from the ashes', 'boom // bust', "smokestack",
].map(norm));

// Well-known 2-card infinite combos (both halves must be present).
const COMBO_PAIRS: [string, string][] = [
  ['thassa\'s oracle', 'demonic consultation'],
  ['thassa\'s oracle', 'tainted pact'],
  ['laboratory maniac', 'demonic consultation'],
  ['kiki-jiki, mirror breaker', 'zealous conscripts'],
  ['kiki-jiki, mirror breaker', 'restoration angel'],
  ['kiki-jiki, mirror breaker', 'pestermite'],
  ['kiki-jiki, mirror breaker', 'combat celebrant'],
  ['splinter twin', 'deceiver exarch'],
  ['splinter twin', 'pestermite'],
  ['mikaeus, the unhallowed', 'triskelion'],
  ['mikaeus, the unhallowed', 'walking ballista'],
  ['isochron scepter', 'dramatic reversal'],
  ['basalt monolith', 'rings of brighthearth'],
  ['deadeye navigator', 'peregrine drake'],
  ['deadeye navigator', 'palinchron'],
  ['devoted druid', 'vizier of remedies'],
  ['heliod, sun-crowned', 'walking ballista'],
  ['godo, bandit warlord', 'helm of the host'],
  ['dockside extortionist', 'temur sabertooth'],
  ['food chain', 'squee, the immortal'],
  ['food chain', 'eternal scourge'],
  ['worldgorger dragon', 'animate dead'],
  ['sanguine bond', 'exquisite blood'],
  ['grand architect', 'pili-pala'],
  ['nim deathmantle', "ashnod's altar"],
].map(([a, b]) => [norm(a), norm(b)] as [string, string]);

export interface BracketResult {
  bracket: number; // 1..5 (2..4 auto-assigned)
  gameChangers: string[];
  massLandDenial: string[];
  extraTurns: string[];
  tutors: string[];
  combos: string[]; // "Card A + Card B"
  reasons: { code: string; cards?: string[] }[];
}

const isLand = (c: DeckCard) => (c.typeLine ?? '').toLowerCase().includes('land');

/** Extra-turn spells: "take an extra turn". */
const isExtraTurn = (c: DeckCard) => /take an extra turn/i.test(c.oracleText ?? '');

/** Non-land tutors that fetch a specific card to hand/top (efficient tutoring). */
const isTutor = (c: DeckCard) => {
  const t = c.oracleText ?? '';
  if (!/search your library for/i.test(t)) return false;
  // Land ramp/fetch is far more acceptable and shouldn't count as an efficient tutor.
  if (/search your library for .{0,40}?\bland/i.test(t)) return false;
  if (/search your library for .{0,40}?\bbasic/i.test(t)) return false;
  return /search your library for (a|an|up to (one|two|three|1|2|3)|two|three)\b/i.test(t);
};

export const estimateBracket = (cards: DeckCard[]): BracketResult | null => {
  const nonEmpty = cards.filter((c) => c.qty > 0);
  if (nonEmpty.length === 0) return null;

  const names = new Set(nonEmpty.map((c) => norm(c.name)));
  const gameChangers = nonEmpty.filter((c) => GAME_CHANGERS.has(norm(c.name))).map((c) => c.name);
  const massLandDenial = nonEmpty
    .filter((c) => MASS_LAND_DENIAL.has(norm(c.name)) || /destroy all lands/i.test(c.oracleText ?? ''))
    .map((c) => c.name);
  const extraTurns = nonEmpty.filter(isExtraTurn).map((c) => c.name);
  const tutors = nonEmpty.filter((c) => !isLand(c) && isTutor(c)).map((c) => c.name);

  const combos: string[] = [];
  for (const [a, b] of COMBO_PAIRS) {
    if (names.has(a) && names.has(b)) {
      const nameA = nonEmpty.find((c) => norm(c.name) === a)!.name;
      const nameB = nonEmpty.find((c) => norm(c.name) === b)!.name;
      combos.push(`${nameA} + ${nameB}`);
    }
  }

  const gc = gameChangers.length;
  let bracket: number;
  if (gc >= 4 || combos.length > 0 || massLandDenial.length > 0) {
    bracket = 4; // Optimized / high power
  } else if (gc >= 1 || extraTurns.length > 0 || tutors.length >= 3) {
    bracket = 3; // Upgraded
  } else {
    bracket = 2; // Core
  }

  const reasons: BracketResult['reasons'] = [];
  if (gameChangers.length) reasons.push({ code: 'gameChangers', cards: gameChangers });
  if (combos.length) reasons.push({ code: 'combos', cards: combos });
  if (massLandDenial.length) reasons.push({ code: 'massLandDenial', cards: massLandDenial });
  if (extraTurns.length) reasons.push({ code: 'extraTurns', cards: extraTurns });
  if (tutors.length) reasons.push({ code: 'tutors', cards: tutors });
  if (reasons.length === 0) reasons.push({ code: 'clean' });

  return { bracket, gameChangers, massLandDenial, extraTurns, tutors, combos, reasons };
};

export const BRACKET_LABELS: Record<number, string> = {
  1: 'Exhibition',
  2: 'Core',
  3: 'Upgraded',
  4: 'Optimized',
  5: 'cEDH',
};
