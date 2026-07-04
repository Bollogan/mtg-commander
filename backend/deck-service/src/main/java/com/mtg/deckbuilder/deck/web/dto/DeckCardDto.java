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
    // Freshly resolved from Scryfall (not persisted on the domain card): the frontend needs these
    // for live format validation (colour identity, bans, rarity) on loaded/saved decks.
    List<String> colorIdentity,
    String rarity,
    java.util.Map<String, String> legalities,
    // Current Scryfall market prices (TCGplayer USD + Cardmarket EUR, incl. foil), null when unknown.
    Double usd,
    Double usdFoil,
    Double eur,
    Double eurFoil) {

  public static DeckCardDto from(DeckCard c, ScryfallCard sc) {
    ScryfallCard.Prices p = sc != null ? sc.prices() : null;
    return new DeckCardDto(c.getScryfallId(), c.getQty(), c.getName(), c.getManaCost(),
        c.getCmc(), c.getTypeLine(), c.getColors(), c.getOracleText(), c.getImageUrl(),
        c.getCategory(), c.isFoil(),
        sc != null ? sc.colorIdentity() : null,
        sc != null ? sc.rarity() : null,
        sc != null ? sc.legalities() : null,
        p != null ? p.usd() : null,
        p != null ? p.usdFoil() : null,
        p != null ? p.eur() : null,
        p != null ? p.eurFoil() : null);
  }

  public static DeckCardDto from(DeckCard c) {
    return from(c, (ScryfallCard) null);
  }
}
