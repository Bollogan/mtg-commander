package com.mtg.deckbuilder.deck.web.dto;

import com.mtg.deckbuilder.deck.domain.Deck;
import com.mtg.deckbuilder.deck.domain.DeckStats;
import com.mtg.deckbuilder.deck.domain.DeckVisibility;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Full deck representation including embedded cards and computed stats. */
public record DeckDto(
    String id,
    UUID ownerId,
    String ownerName,
    String ownerAvatarUrl,
    String name,
    String format,
    DeckVisibility visibility,
    String description,
    String commanderName,
    List<DeckCardDto> cards,
    DeckStats stats,
    Instant createdAt,
    Instant updatedAt) {

  public static DeckDto from(Deck deck, String ownerName, String ownerAvatarUrl) {
    return new DeckDto(
        deck.getId(),
        deck.getOwnerId(),
        ownerName != null ? ownerName : deck.getOwnerName(),
        ownerAvatarUrl,
        deck.getName(),
        deck.getFormat(),
        deck.getVisibility(),
        deck.getDescription(),
        deck.getCommanderName(),
        deck.getCards().stream().map(DeckCardDto::from).toList(),
        deck.getStats(),
        deck.getCreatedAt(),
        deck.getUpdatedAt());
  }

  public static DeckDto from(Deck deck) {
    return from(deck, deck.getOwnerName(), null);
  }
}
