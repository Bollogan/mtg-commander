package com.mtg.deckbuilder.deck.web.dto;

import com.mtg.deckbuilder.deck.domain.CategoryTemplate;
import com.mtg.deckbuilder.deck.domain.DeckCategory;
import java.time.Instant;
import java.util.List;

public record CategoryTemplateDto(
    String id,
    String name,
    List<DeckCategoryDto> categories,
    boolean global,
    Instant createdAt,
    Instant updatedAt) {

  public static CategoryTemplateDto from(CategoryTemplate t) {
    if (t == null) {
      return null;
    }
    return new CategoryTemplateDto(
        t.getId(),
        t.getName(),
        t.getCategories().stream().map(DeckCategoryDto::from).toList(),
        t.isGlobal(),
        t.getCreatedAt(),
        t.getUpdatedAt());
  }
}
