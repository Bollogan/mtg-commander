package com.mtg.deckbuilder.deck.web.dto;

import com.mtg.deckbuilder.deck.domain.Deck;
import com.mtg.deckbuilder.deck.domain.DeckStats;
import com.mtg.deckbuilder.deck.domain.DeckVisibility;
import com.mtg.deckbuilder.deck.scryfall.ScryfallCard;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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
    List<DeckCategoryDto> categories,
    DeckStats stats,
    long views,
    int likes,
    boolean liked,
    Instant createdAt,
    Instant updatedAt) {

  public static DeckDto from(Deck deck, String ownerName, String ownerAvatarUrl, UUID requesterId,
      Map<String, ScryfallCard.Prices> pricesById) {
    List<UUID> likedBy = deck.getLikedBy();
    int likes = likedBy == null ? 0 : likedBy.size();
    boolean liked = requesterId != null && likedBy != null && likedBy.contains(requesterId);
    Map<String, ScryfallCard.Prices> prices = pricesById == null ? Map.of() : pricesById;
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
        deck.getCards().stream()
            .map(c -> DeckCardDto.from(c, prices.get(c.getScryfallId())))
            .toList(),
        deck.getCategories().stream().map(DeckCategoryDto::from).toList(),
        deck.getStats(),
        deck.getViews(),
        likes,
        liked,
        deck.getCreatedAt(),
        deck.getUpdatedAt());
  }

  public static DeckDto from(Deck deck, String ownerName, String ownerAvatarUrl, UUID requesterId) {
    return from(deck, ownerName, ownerAvatarUrl, requesterId, null);
  }

  public static DeckDto from(Deck deck, String ownerName, String ownerAvatarUrl) {
    return from(deck, ownerName, ownerAvatarUrl, null, null);
  }

  public static DeckDto from(Deck deck) {
    return from(deck, deck.getOwnerName(), null, null, null);
  }
}
