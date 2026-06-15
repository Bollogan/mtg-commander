package com.mtg.deckbuilder.user.domain;

/**
 * Achievement catalogue. {@code label} is the human-facing name used in API responses.
 */
public enum BadgeType {
    FIRST_DECK("First Deck", "Built your very first deck"),
    TEN_FOLLOWERS("Rising Star", "Reached 10 followers"),
    HUNDRED_FOLLOWERS("Community Pillar", "Reached 100 followers"),
    FIRST_FOLLOWER("Welcome Aboard", "Gained your first follower");

    private final String label;
    private final String description;

    BadgeType(String label, String description) {
        this.label = label;
        this.description = description;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }
}
