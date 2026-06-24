package com.mtg.deckbuilder.deck.web.dto;

import com.mtg.deckbuilder.deck.domain.DeckVisibility;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record DeckRequest(
    @NotBlank @Size(min = 2, max = 100) String name,
    @NotBlank @Size(min = 2, max = 30) String format,
    DeckVisibility visibility,
    @Size(max = 2000) String description,
    String commanderName,
    @Valid List<CardEntryRequest> cards) {
}
