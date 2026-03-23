package com.mtg.deckbuilder.deck;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeckRequest(
    @NotBlank @Size(min = 2, max = 100) String name,
    @NotBlank @Size(min = 2, max = 30) String format,
    DeckVisibility visibility,
    @Size(max = 2000) String description,
    String commanderName
) {}
