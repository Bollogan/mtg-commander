package com.mtg.deckbuilder.forum.web.dto;

import java.util.Set;

/**
 * Parsed parameters of an advanced forum search (spec §2.3). All fields except {@code query} are
 * optional filters; {@code searchIn} selects which text fields the query matches against and
 * {@code sortBy} picks the ordering. {@code page}/{@code size} drive offset pagination.
 */
public record ForumSearchCriteria(
    String query,
    Set<String> searchIn,
    String category,
    String activityLevel,
    Long minMembers,
    Long maxMembers,
    String language,
    String sortBy,
    Boolean nsfw,
    int page,
    int size) {

    public static final Set<String> ALL_FIELDS = Set.of("name", "description", "tags");

    /** Fields to match the query in, defaulting to name + description when none supplied. */
    public Set<String> effectiveSearchIn() {
        if (searchIn == null || searchIn.isEmpty()) {
            return Set.of("name", "description");
        }
        return searchIn;
    }

    public boolean hasQuery() {
        return query != null && !query.isBlank();
    }

    public String effectiveSortBy() {
        return sortBy == null || sortBy.isBlank() ? (hasQuery() ? "relevance" : "activity") : sortBy;
    }
}
