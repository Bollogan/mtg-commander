package com.mtg.deckbuilder.deck.web.dto;

/** A single card suggestion for a deck. {@code source} is "ai" or "mock". */
public record SuggestionDto(
    String scryfallId,
    String name,
    String imageUrl,
    String reason,
    String source) {
}
