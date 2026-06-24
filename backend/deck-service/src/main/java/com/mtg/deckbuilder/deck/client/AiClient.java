package com.mtg.deckbuilder.deck.client;

import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * Calls ai-service for deck recommendations. ai-service arrives in Fase 4; until then
 * (or whenever it is down) the deck-service falls back to a local mock — callers must
 * catch failures from this client. See {@code SuggestionService}.
 */
@FeignClient(name = "ai-service", path = "/api/ai")
public interface AiClient {

  @PostMapping("/recommend")
  AiRecommendResponse recommend(@RequestBody AiRecommendRequest request);

  record AiRecommendRequest(String deckId, String format, List<String> cardIds) {
  }

  record AiRecommendResponse(List<AiSuggestion> suggestions) {
  }

  record AiSuggestion(String scryfallId, String name, String reason) {
  }
}
