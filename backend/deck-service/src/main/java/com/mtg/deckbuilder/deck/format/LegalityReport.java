package com.mtg.deckbuilder.deck.format;

import java.util.List;

/**
 * The outcome of validating a deck against its format's {@link Formats.FormatRules}.
 * Advisory (non-blocking): a deck can be saved while illegal; the UI surfaces this.
 */
public record LegalityReport(
    String format,
    String label,
    boolean legal,
    int deckSize,
    int minDeckSize,
    Integer maxDeckSize,
    List<Violation> violations) {

  /** type ∈ {SIZE, COPIES, BANNED, RESTRICTED, NOT_LEGAL, COLOR_IDENTITY, RARITY}. */
  public record Violation(String type, String cardName, String detail) {
  }
}
