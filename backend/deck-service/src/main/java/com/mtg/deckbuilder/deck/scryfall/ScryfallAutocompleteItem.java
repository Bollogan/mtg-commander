package com.mtg.deckbuilder.deck.scryfall;

/**
 * Lightweight card payload for autocomplete/quick-add UIs.
 * Contains just enough data to render a suggestion without the full Scryfall card.
 */
public record ScryfallAutocompleteItem(
    String id,
    String name,
    String manaCost,
    String typeLine,
    String imageUrl) {

  public static ScryfallAutocompleteItem from(ScryfallCard card) {
    if (card == null) {
      return null;
    }
    String imageUrl = card.imageUris() != null ? card.imageUris().normal() : null;
    if (imageUrl == null && card.imageUris() != null) {
      imageUrl = card.imageUris().small();
    }
    return new ScryfallAutocompleteItem(
        card.id(),
        card.name(),
        card.manaCost(),
        card.typeLine(),
        imageUrl);
  }
}
