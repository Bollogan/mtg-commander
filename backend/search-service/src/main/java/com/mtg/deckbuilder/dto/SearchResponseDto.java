package com.mtg.deckbuilder.dto;

import java.util.List;

public record SearchResponseDto(
    List<CardDto> cards,
    int page,
    int pageSize,
    int totalCards,
    boolean hasMore
) {
}
