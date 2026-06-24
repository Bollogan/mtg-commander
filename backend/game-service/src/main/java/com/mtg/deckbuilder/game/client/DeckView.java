package com.mtg.deckbuilder.game.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/** Minimal projection of deck-service's DeckDto needed to build a library. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record DeckView(String id, String name, List<Card> cards) {

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Card(String scryfallId, int qty, String name, String typeLine, String imageUrl) {
  }
}
