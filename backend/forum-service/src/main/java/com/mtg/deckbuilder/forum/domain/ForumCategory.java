package com.mtg.deckbuilder.forum.domain;

/**
 * High-level category of a forum board. Stored by {@code name()} on the {@link Thread} document.
 * {@code CUSTOM} lets creators opt out of the fixed taxonomy (paired with free-form tags).
 */
public enum ForumCategory {
    GENERAL,
    DECK_DISCUSSION,
    RULES,
    TRADE,
    LORE,
    CUSTOM;

    /** Lenient parse: unknown / null values fall back to {@link #GENERAL}. */
    public static ForumCategory parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return GENERAL;
        }
        try {
            return valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return CUSTOM;
        }
    }
}
