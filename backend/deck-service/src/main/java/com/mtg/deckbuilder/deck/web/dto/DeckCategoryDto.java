package com.mtg.deckbuilder.deck.web.dto;

import com.mtg.deckbuilder.deck.domain.DeckCategory;

public record DeckCategoryDto(
    String name,
    String color,
    String icon,
    int order) {

  public static DeckCategoryDto from(DeckCategory c) {
    if (c == null) {
      return null;
    }
    return new DeckCategoryDto(c.getName(), c.getColor(), c.getIcon(), c.getOrder());
  }

  public DeckCategory toDomain() {
    return new DeckCategory(name, color, icon, order);
  }
}
