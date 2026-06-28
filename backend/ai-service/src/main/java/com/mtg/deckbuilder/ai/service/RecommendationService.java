package com.mtg.deckbuilder.ai.service;

import com.mtg.deckbuilder.ai.client.DeckClient;
import com.mtg.deckbuilder.ai.client.DeckView;
import com.mtg.deckbuilder.ai.web.RecommendRequest;
import com.mtg.deckbuilder.ai.web.RecommendResponse;
import com.mtg.deckbuilder.ai.web.RecommendResponse.Suggestion;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.circuitbreaker.CircuitBreakerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Proxies recommendations to an external community AI model with a 3s timeout, wrapped in a
 * Resilience4j circuit breaker. On timeout, error, open circuit, or when the external model
 * is disabled, it falls back to deck-service's keyword co-occurrence (Fase 4 task 5).
 */
@Service
public class RecommendationService {

  private static final Logger log = LoggerFactory.getLogger(RecommendationService.class);
  private static final int MAX_SUGGESTIONS = 6;

  private final RestClient externalAiRestClient;
  private final DeckClient deckClient;
  private final CircuitBreakerFactory<?, ?> circuitBreakerFactory;
  private final boolean externalEnabled;

  public RecommendationService(RestClient externalAiRestClient,
                               DeckClient deckClient,
                               CircuitBreakerFactory<?, ?> circuitBreakerFactory,
                               @Value("${ai.external.enabled:false}") boolean externalEnabled) {
    this.externalAiRestClient = externalAiRestClient;
    this.deckClient = deckClient;
    this.circuitBreakerFactory = circuitBreakerFactory;
    this.externalEnabled = externalEnabled;
  }

  public RecommendResponse recommend(RecommendRequest request) {
    if (!externalEnabled) {
      return fallback(request);
    }
    return circuitBreakerFactory.create("aiExternal")
        .run(() -> callExternal(request), throwable -> {
          log.warn("External AI model failed ({}), using co-occurrence fallback",
              throwable.getMessage());
          return fallback(request);
        });
  }

  private RecommendResponse callExternal(RecommendRequest request) {
    ExternalResponse external = externalAiRestClient.post()
        .uri("/recommend")
        .body(request)
        .retrieve()
        .body(ExternalResponse.class);
    if (external == null || external.suggestions() == null) {
      throw new IllegalStateException("Empty external response");
    }
    List<Suggestion> suggestions = external.suggestions().stream()
        .limit(MAX_SUGGESTIONS)
        .map(s -> new Suggestion(s.scryfallId(), s.name(), s.reason()))
        .toList();
    return new RecommendResponse(suggestions, "external");
  }

  /**
   * Co-occurrence fallback: reuse deck-service's precomputed synergies, then recommend the
   * deck's own cards most central to the dominant keyword as the synergy core.
   */
  RecommendResponse fallback(RecommendRequest request) {
    try {
      DeckView deck = deckClient.getDeck(request.deckId());
      if (deck == null || deck.stats() == null || deck.stats().synergies() == null
          || deck.stats().synergies().isEmpty()) {
        return new RecommendResponse(List.of(), "fallback");
      }
      String keyword = deck.stats().synergies().get(0).keyword().toLowerCase(Locale.ROOT);
      List<Suggestion> suggestions = new ArrayList<>();
      if (deck.cards() != null) {
        for (DeckView.Card card : deck.cards()) {
          String oracle = card.oracleText() == null ? ""
              : card.oracleText().toLowerCase(Locale.ROOT);
          if (oracle.contains(keyword)) {
            suggestions.add(new Suggestion(card.scryfallId(), card.name(),
                "Co-occurrence: central to your '" + keyword + "' synergy"));
          }
          if (suggestions.size() >= MAX_SUGGESTIONS) {
            break;
          }
        }
      }
      return new RecommendResponse(suggestions, "fallback");
    } catch (RuntimeException e) {
      log.warn("Fallback could not reach deck-service for {}: {}",
          request.deckId(), e.getMessage());
      return new RecommendResponse(List.of(), "fallback");
    }
  }

  /** Shape returned by the external community model. */
  private record ExternalResponse(List<ExternalSuggestion> suggestions) {
  }

  private record ExternalSuggestion(String scryfallId, String name, String reason) {
  }
}
