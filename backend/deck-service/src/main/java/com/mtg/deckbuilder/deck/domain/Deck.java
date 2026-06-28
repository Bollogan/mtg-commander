package com.mtg.deckbuilder.deck.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Deck aggregate persisted in MongoDB. Cards are embedded (per plan:
 * {@code cards: [{scryfallId, qty}]}) and {@code stats} are recomputed on save.
 */
@Document(collection = "decks")
public class Deck {

  @Id
  private String id;

  @Indexed
  private UUID ownerId;

  private String ownerName;
  private String name;
  private String format;
  private DeckVisibility visibility = DeckVisibility.PRIVATE;
  private String description;
  private String commanderName;

  private List<DeckCard> cards = new ArrayList<>();
  private DeckStats stats = new DeckStats();

  private Instant createdAt;
  private Instant updatedAt;

  public boolean isPublic() {
    return visibility == DeckVisibility.PUBLIC;
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public UUID getOwnerId() {
    return ownerId;
  }

  public void setOwnerId(UUID ownerId) {
    this.ownerId = ownerId;
  }

  public String getOwnerName() {
    return ownerName;
  }

  public void setOwnerName(String ownerName) {
    this.ownerName = ownerName;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getFormat() {
    return format;
  }

  public void setFormat(String format) {
    this.format = format;
  }

  public DeckVisibility getVisibility() {
    return visibility;
  }

  public void setVisibility(DeckVisibility visibility) {
    this.visibility = visibility;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getCommanderName() {
    return commanderName;
  }

  public void setCommanderName(String commanderName) {
    this.commanderName = commanderName;
  }

  public List<DeckCard> getCards() {
    return cards;
  }

  public void setCards(List<DeckCard> cards) {
    this.cards = cards == null ? new ArrayList<>() : cards;
  }

  public DeckStats getStats() {
    return stats;
  }

  public void setStats(DeckStats stats) {
    this.stats = stats;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
