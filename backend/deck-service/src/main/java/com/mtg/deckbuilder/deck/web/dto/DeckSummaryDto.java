package com.mtg.deckbuilder.deck.web.dto;

import com.mtg.deckbuilder.deck.domain.Deck;
import com.mtg.deckbuilder.deck.domain.DeckVisibility;
import java.time.Instant;
import java.util.UUID;

/** Lightweight deck view for lists (no embedded cards). */
public record DeckSummaryDto(
    String id,
    UUID ownerId,
    String ownerName,
    String name,
    String format,
    DeckVisibility visibility,
    String description,
    String commanderName,
    int totalCards,
    Instant updatedAt) {

  public static DeckSummaryDto from(Deck deck) {
    int total = deck.getStats() != null ? deck.getStats().getTotalCards() : deck.getCards().size();
    return new DeckSummaryDto(
        deck.getId(),
        deck.getOwnerId(),
        deck.getOwnerName(),
        deck.getName(),
        deck.getFormat(),
        deck.getVisibility(),
        deck.getDescription(),
        deck.getCommanderName(),
        total,
        deck.getUpdatedAt());
  }
}
