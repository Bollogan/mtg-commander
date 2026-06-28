package com.mtg.deckbuilder.deck.scryfall;

import java.util.List;

/**
 * Trimmed, denormalized view of a Scryfall card — only the fields the deck-service
 * needs for rendering and stats. Cached in Redis as JSON.
 */
public record ScryfallCard(
    String id,
    String name,
    String manaCost,
    double cmc,
    List<String> colors,
    List<String> colorIdentity,
    String typeLine,
    String oracleText,
    String power,
    String toughness,
    ImageUris imageUris,
    String setName,
    String rarity) {

  public record ImageUris(String small, String normal, String large, String artCrop) {
  }
}
