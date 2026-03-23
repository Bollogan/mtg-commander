package com.mtg.deckbuilder.dto;

import java.util.List;

public record EdhrecCategoryDto(
    String header,
    String tag,
    List<CardDto> cards
) {
}
