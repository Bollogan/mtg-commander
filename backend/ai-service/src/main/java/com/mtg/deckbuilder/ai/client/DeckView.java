package com.mtg.deckbuilder.ai.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/** Projection of deck-service's DeckDto: cards + the synergies it already computed. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record DeckView(String id, String name, List<Card> cards, Stats stats) {

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Card(String scryfallId, String name, String oracleText, String imageUrl) {
  }

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Stats(List<KeywordSynergy> synergies) {
  }

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record KeywordSynergy(String keyword, int cardCount) {
  }
}
