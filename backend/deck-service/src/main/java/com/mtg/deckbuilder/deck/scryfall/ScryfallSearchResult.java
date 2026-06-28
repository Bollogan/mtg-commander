package com.mtg.deckbuilder.deck.scryfall;

import java.util.List;

/** Page of Scryfall search results returned to the frontend. */
public record ScryfallSearchResult(
    List<ScryfallCard> cards,
    int totalCards,
    boolean hasMore) {

  public static ScryfallSearchResult empty() {
    return new ScryfallSearchResult(List.of(), 0, false);
  }
}
