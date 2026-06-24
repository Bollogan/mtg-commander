package com.mtg.deckbuilder.ai.web;

import java.util.List;

/**
 * Recommendation response. {@code source} is "external" when the community AI model answered
 * or "fallback" when the local co-occurrence engine was used.
 */
public record RecommendResponse(List<Suggestion> suggestions, String source) {

  public record Suggestion(String scryfallId, String name, String reason) {
  }
}
