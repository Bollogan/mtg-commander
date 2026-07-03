import { apiClient } from '../api/client';
import type { ScryfallCard } from '../features/deck/deckSlice';

export type ImportSection = 'commander' | 'main' | 'sideboard' | 'companion' | 'unknown';

export interface ImportLine {
  raw: string;
  qty: number;
  name: string;
  section: ImportSection;
}

export interface ImportResult {
  cards: { card: ScryfallCard; qty: number; section: ImportSection }[];
  errors: string[];
}

const SECTION_HEADERS: Record<string, ImportSection> = {
  commander: 'commander',
  commanders: 'commander',
  edh: 'commander',
  deck: 'main',
  'main deck': 'main',
  maindeck: 'main',
  mainboard: 'main',
  sideboard: 'sideboard',
  'side board': 'sideboard',
  sb: 'sideboard',
  companion: 'companion',
};

const isSectionHeader = (line: string): ImportSection | null => {
  const normalized = line.toLowerCase().replace(/:$/, '').trim();
  return SECTION_HEADERS[normalized] ?? null;
};

const cleanLine = (line: string): string => {
  return line
    .replace(/^\s*\/\/\s*/, '')
    .replace(/\s*\(.*\)\s*$/, '')
    .replace(/\s*\[.*\]\s*$/, '')
    .replace(/\s*\*F\*\s*$/, '')
    .trim();
};

const parseCardLine = (line: string, section: ImportSection): ImportLine | null => {
  const cleaned = cleanLine(line);
  if (!cleaned) return null;

  // Match quantity prefix: "1 Sol Ring", "4x Lightning Bolt", "1x Sol Ring"
  const match = cleaned.match(/^(\d+)\s*x?\s+(.+)$/i);
  if (!match) {
    // Assume quantity 1 if line starts with a card name
    return { raw: line, qty: 1, name: cleaned, section };
  }

  const qty = parseInt(match[1], 10);
  const name = match[2].trim();
  return { raw: line, qty, name, section };
};

export const parseDeckList = (text: string): ImportLine[] => {
  const lines = text.split(/\r?\n/);
  const result: ImportLine[] = [];
  let currentSection: ImportSection = 'main';
  let blankLineCount = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Skip comments and metadata
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      if (!trimmed) blankLineCount++;
      continue;
    }

    const section = isSectionHeader(trimmed);
    if (section) {
      currentSection = section;
      blankLineCount = 0;
      continue;
    }

    // A blank line in a main-only list usually separates sideboard
    if (blankLineCount > 0 && currentSection === 'main') {
      currentSection = 'sideboard';
    }
    blankLineCount = 0;

    const parsed = parseCardLine(trimmed, currentSection);
    if (parsed) {
      result.push(parsed);
    }
  }

  return result;
};

export const resolveImportLines = async (lines: ImportLine[]): Promise<ImportResult> => {
  const cards: ImportResult['cards'] = [];
  const errors: string[] = [];

  for (const line of lines) {
    try {
      const { data } = await apiClient.get<ScryfallCard>('/api/decks/cards/named', {
        params: { fuzzy: line.name },
      });
      cards.push({ card: data, qty: line.qty, section: line.section });
    } catch {
      errors.push(`Could not resolve: ${line.raw}`);
    }
  }

  return { cards, errors };
};
