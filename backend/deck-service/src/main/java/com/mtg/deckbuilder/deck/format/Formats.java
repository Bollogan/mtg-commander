package com.mtg.deckbuilder.deck.format;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Master data for the supported constructed formats: deck-size bounds, copy limits, singleton and
 * the extra rules (commander identity, pauper commons-only, vintage restricted list). This is the
 * single source of truth the {@code DeckLegalityService} and the {@code /api/decks/formats}
 * endpoint expose; the frontend mirrors it in {@code src/data/formats.ts}.
 */
public final class Formats {

  private Formats() {
  }

  /**
   * @param format the format key (matches Scryfall's legality keys, e.g. "commander")
   * @param label human-friendly name
   * @param minDeckSize minimum main-deck size
   * @param maxDeckSize maximum main-deck size, or null when there is no upper bound (60+)
   * @param maxCopies max copies of any one card (basics exempt); 1 for singleton formats
   * @param singleton whether only one copy of each non-basic card is allowed
   * @param requiresCommander whether the deck needs a commander (color-identity rule applies)
   * @param commonsOnly whether only common-rarity cards are allowed (Pauper)
   * @param useRestrictedList whether "restricted" cards are capped at 1 copy (Vintage)
   */
  public record FormatRules(
      String format,
      String label,
      int minDeckSize,
      Integer maxDeckSize,
      int maxCopies,
      boolean singleton,
      boolean requiresCommander,
      boolean commonsOnly,
      boolean useRestrictedList) {
  }

  private static final Map<String, FormatRules> REGISTRY = new LinkedHashMap<>();

  private static void register(FormatRules rules) {
    REGISTRY.put(rules.format(), rules);
  }

  static {
    register(new FormatRules("commander", "Commander", 100, 100, 1, true, true, false, false));
    register(new FormatRules("standard", "Standard", 60, null, 4, false, false, false, false));
    register(new FormatRules("pioneer", "Pioneer", 60, null, 4, false, false, false, false));
    register(new FormatRules("modern", "Modern", 60, null, 4, false, false, false, false));
    register(new FormatRules("legacy", "Legacy", 60, null, 4, false, false, false, false));
    register(new FormatRules("vintage", "Vintage", 60, null, 4, false, false, false, true));
    register(new FormatRules("pauper", "Pauper", 60, null, 4, false, false, true, false));
  }

  /** Falls back to a permissive "casual" ruleset for unknown formats (no bans, no size cap). */
  private static final FormatRules CASUAL =
      new FormatRules("casual", "Casual", 0, null, Integer.MAX_VALUE, false, false, false, false);

  public static FormatRules rulesFor(String format) {
    if (format == null) {
      return CASUAL;
    }
    return REGISTRY.getOrDefault(format.trim().toLowerCase(), CASUAL);
  }

  public static List<FormatRules> all() {
    return List.copyOf(REGISTRY.values());
  }
}
