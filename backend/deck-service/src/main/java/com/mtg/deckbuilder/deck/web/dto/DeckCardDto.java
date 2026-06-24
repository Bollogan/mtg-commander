package com.mtg.deckbuilder.deck.web.dto;

import com.mtg.deckbuilder.deck.domain.DeckCard;
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
    String category) {

  public static DeckCardDto from(DeckCard c) {
    return new DeckCardDto(c.getScryfallId(), c.getQty(), c.getName(), c.getManaCost(),
        c.getCmc(), c.getTypeLine(), c.getColors(), c.getOracleText(), c.getImageUrl(),
        c.getCategory());
  }
}
