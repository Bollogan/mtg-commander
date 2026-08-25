package com.mtg.deckbuilder.dto;

import java.util.List;

/**
 * One "apartado" of recommander.cards recommendations: a stable {@code id} the UI keys its
 * label/icon off, a fallback English {@code label}, and the ranked cards in that category.
 *
 * @param id     stable identifier ({@code top}, {@code creatures}, … {@code utility-lands})
 * @param label  English fallback label, used when the client has no translation for {@code id}
 * @param cards  cards of this category, kept in recommendation-score order
 */
public record RecommanderCategoryDto(String id, String label, List<CardDto> cards) {
}
