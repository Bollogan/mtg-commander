package com.mtg.deckbuilder.deck.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/** A single card entry in a deck mutation request. */
public record CardEntryRequest(
    @NotBlank String scryfallId,
    @Min(1) int qty,
    String category,
    boolean foil) {
}
