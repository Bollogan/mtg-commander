package com.mtg.deckbuilder.ai.web;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/** Recommendation request from deck-service (matches its AiClient contract). */
public record RecommendRequest(
    @NotBlank String deckId,
    String format,
    List<String> cardIds) {
}
