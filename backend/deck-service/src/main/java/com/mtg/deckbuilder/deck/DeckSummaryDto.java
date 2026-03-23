package com.mtg.deckbuilder.deck;

import java.time.Instant;
import java.util.UUID;

public record DeckSummaryDto(
    UUID id,
    String name,
    String format,
    DeckVisibility visibility,
    String description,
    String commanderName,
    Instant updatedAt,
    String ownerName
) {
  public static DeckSummaryDto from(DeckEntity deck) {
    return new DeckSummaryDto(
        deck.getId(),
        deck.getName(),
        deck.getFormat(),
        deck.getVisibility(),
        deck.getDescription(),
        deck.getCommanderName(),
        deck.getUpdatedAt(),
        deck.getOwnerName());
  }
}
