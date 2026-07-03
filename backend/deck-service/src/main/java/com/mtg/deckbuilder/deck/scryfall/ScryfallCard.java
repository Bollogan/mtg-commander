package com.mtg.deckbuilder.deck.scryfall;

import java.util.List;
import java.util.Map;

/**
 * Trimmed, denormalized view of a Scryfall card — only the fields the deck-service
 * needs for rendering, stats and format legality. Cached in Redis as JSON.
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
    String rarity,
    /** Scryfall per-format legality: format → legal|not_legal|banned|restricted. */
    Map<String, String> legalities,
    /** Market prices from Scryfall (TCGplayer USD + Cardmarket EUR, incl. foil), null when unknown. */
    Prices prices) {

  public record ImageUris(String small, String normal, String large, String artCrop) {
  }

  public record Prices(Double usd, Double usdFoil, Double eur, Double eurFoil, Double tix) {
  }
}
