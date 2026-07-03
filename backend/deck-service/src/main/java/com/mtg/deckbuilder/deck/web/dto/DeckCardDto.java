package com.mtg.deckbuilder.deck.web.dto;

import com.mtg.deckbuilder.deck.domain.DeckCard;
import com.mtg.deckbuilder.deck.scryfall.ScryfallCard;
import java.util.List;

public record DeckCardDto(
    String scryfallId,
    int qty,
    String name,
    String manaCost,
    double cmc,
    String typeLine,
    List<String> colors,
    String oracleText,
    String imageUrl,
    String category,
    boolean foil,
    // Current Scryfall market prices (TCGplayer USD + Cardmarket EUR, incl. foil), null when unknown.
    Double usd,
    Double usdFoil,
    Double eur,
    Double eurFoil) {

  public static DeckCardDto from(DeckCard c, ScryfallCard.Prices p) {
    return new DeckCardDto(c.getScryfallId(), c.getQty(), c.getName(), c.getManaCost(),
        c.getCmc(), c.getTypeLine(), c.getColors(), c.getOracleText(), c.getImageUrl(),
        c.getCategory(), c.isFoil(),
        p != null ? p.usd() : null,
        p != null ? p.usdFoil() : null,
        p != null ? p.eur() : null,
        p != null ? p.eurFoil() : null);
  }

  public static DeckCardDto from(DeckCard c) {
    return from(c, null);
  }
}
