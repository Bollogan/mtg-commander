package com.mtg.deckbuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.mtg.deckbuilder.dto.CardDto;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Server-side proxy to the public recommander.cards API
 * (https://api.recommander.cards/public-release). Avoids browser CORS, centralises the
 * rate limit, and resolves the returned {name, oracle_id, score} list into full Scryfall
 * cards for the UI. Returns an empty list on any failure so the caller can fall back.
 */
@Service
public class RecommanderService {

  private static final Logger log = LoggerFactory.getLogger(RecommanderService.class);
  private static final String BASE_URL = "https://api.recommander.cards/public-release";

  private final RestClient client;
  private final ScryfallService scryfallService;

  public RecommanderService(ScryfallService scryfallService) {
    this.scryfallService = scryfallService;
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
    factory.setReadTimeout((int) Duration.ofSeconds(8).toMillis());
    this.client = RestClient.builder()
        .baseUrl(BASE_URL)
        .requestFactory(factory)
        .defaultHeader("User-Agent", "mtg-deck-builder/1.0")
        .defaultHeader("Accept", "application/json")
        .build();
  }

  /**
   * Recommended cards for a commander (by name), ranked by recommender score and resolved to
   * full card data via Scryfall.
   */
  public List<CardDto> recommendForCommander(String commanderName, int limit) {
    if (commanderName == null || commanderName.isBlank()) {
      return List.of();
    }
    try {
      JsonNode response = client.post()
          .uri("/api/decks/recommend/top")
          .body(Map.of("card_format", "name", "commander", commanderName))
          .retrieve()
          .body(JsonNode.class);

      if (response == null || !"success".equals(response.path("result_code").asText())) {
        log.info("recommander returned no data for '{}': {}",
            commanderName, response == null ? "null" : response.path("result_code").asText());
        return List.of();
      }

      List<String> names = new ArrayList<>();
      for (JsonNode rec : response.path("data").path("recommendations")) {
        String name = rec.path("name").asText(null);
        if (name != null && !name.isBlank()) {
          names.add(name);
        }
        if (limit > 0 && names.size() >= limit) {
          break;
        }
      }
      return scryfallService.getCardsByNames(names);
    } catch (RuntimeException e) {
      log.warn("recommander request failed for '{}': {}", commanderName, e.getMessage());
      return List.of();
    }
  }
}
