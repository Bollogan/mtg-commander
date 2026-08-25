import type { RecommanderCategory } from '../services/scryfallApi';

/** Just the slice of i18next's `t` this module needs — key plus English fallback. */
type Translate = (key: string, defaultValue: string) => string;

/**
 * Presentation metadata for the recommander.cards apartados. The backend decides which
 * categories exist and in what order; this only maps a category id to its icon and to the
 * translation key used for its label.
 */
const CATEGORY_ICONS: Record<string, string> = {
  top: '⭐',
  creatures: '🐾',
  artifacts: '⚙️',
  enchantments: '✨',
  instants: '⚡',
  sorceries: '🌀',
  planeswalkers: '🧙',
  battles: '⚔️',
  'utility-lands': '🗺️',
  lands: '⛰️',
  other: '🎴',
};

export const recommanderCategoryIcon = (id: string): string => CATEGORY_ICONS[id] ?? '•';

/**
 * Translated name of an apartado, falling back to the English label the backend sent (so a
 * category added server-side still renders sensibly before its translation exists).
 */
export const recommanderCategoryLabel = (
  t: Translate,
  category: Pick<RecommanderCategory, 'id' | 'label'>,
): string => t(`recommander.category.${category.id}`, category.label);
