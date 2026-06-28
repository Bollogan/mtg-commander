package com.mtg.deckbuilder.deck.scryfall;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Non-blocking Scryfall client (WebClient) with a Redis read-through cache (TTL 24h).
 * Mitigates Scryfall's ~10 req/s rate limit (see plan risk matrix). The reactive call
 * is resolved at the service boundary since the rest of the stack is servlet-based.
 */
@Component
public class ScryfallClient {

  private static final Logger log = LoggerFactory.getLogger(ScryfallClient.class);
  private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);
  private static final String CARD_KEY = "scryfall:card:";
  private static final String SEARCH_KEY = "scryfall:search:";

  private final WebClient webClient;
  private final StringRedisTemplate redis;
  private final ObjectMapper objectMapper;
  private final ScryfallCardMapper cardMapper;
  private final Duration cacheTtl;

  public ScryfallClient(WebClient scryfallWebClient,
                        StringRedisTemplate redis,
                        ObjectMapper objectMapper,
                        ScryfallCardMapper cardMapper,
                        @Value("${scryfall.cache-ttl-hours:24}") long cacheTtlHours) {
    this.webClient = scryfallWebClient;
    this.redis = redis;
    this.objectMapper = objectMapper;
    this.cardMapper = cardMapper;
    this.cacheTtl = Duration.ofHours(cacheTtlHours);
  }

  /** Fetch a single card by Scryfall id, read-through cached in Redis. */
  public ScryfallCard getCard(String id) {
    if (id == null || id.isBlank()) {
      return null;
    }
    String cacheKey = CARD_KEY + id;
    ScryfallCard cached = readCard(cacheKey);
    if (cached != null) {
      return cached;
    }
    try {
      JsonNode raw = webClient.get()
          .uri("/cards/{id}", id)
          .retrieve()
          .bodyToMono(JsonNode.class)
          .timeout(REQUEST_TIMEOUT)
          .block();
      ScryfallCard card = cardMapper.map(raw);
      if (card != null) {
        writeJson(cacheKey, card);
      }
      return card;
    } catch (RuntimeException e) {
      log.warn("Scryfall getCard({}) failed: {}", id, e.getMessage());
      return null;
    }
  }

  /** Resolve a list of card ids, hitting Redis first and batching the misses. */
  public Map<String, ScryfallCard> getCards(List<String> ids) {
    Map<String, ScryfallCard> result = new LinkedHashMap<>();
    if (ids == null || ids.isEmpty()) {
      return result;
    }
    List<String> misses = new ArrayList<>();
    for (String id : ids.stream().distinct().toList()) {
      ScryfallCard cached = readCard(CARD_KEY + id);
      if (cached != null) {
        result.put(id, cached);
      } else {
        misses.add(id);
      }
    }
    for (List<String> batch : partition(misses, 75)) {
      fetchCollection(batch).forEach((id, card) -> {
        writeJson(CARD_KEY + id, card);
        result.put(id, card);
      });
    }
    return result;
  }

  /** Search cards, cached per (query, page). */
  public ScryfallSearchResult search(String query, int page) {
    if (query == null || query.isBlank()) {
      return ScryfallSearchResult.empty();
    }
    int safePage = Math.max(1, page);
    String cacheKey = SEARCH_KEY + query.trim().toLowerCase() + ":" + safePage;
    ScryfallSearchResult cached = readJson(cacheKey, ScryfallSearchResult.class);
    if (cached != null) {
      return cached;
    }
    try {
      JsonNode response = webClient.get()
          .uri(uri -> uri.path("/cards/search")
              .queryParam("q", query)
              .queryParam("unique", "cards")
              .queryParam("order", "name")
              .queryParam("page", safePage)
              .build())
          .retrieve()
          .bodyToMono(JsonNode.class)
          .timeout(REQUEST_TIMEOUT)
          .block();

      if (response == null || !"list".equals(response.path("object").asText())) {
        return ScryfallSearchResult.empty();
      }
      List<ScryfallCard> cards = new ArrayList<>();
      for (JsonNode raw : response.path("data")) {
        ScryfallCard card = cardMapper.map(raw);
        if (card != null) {
          cards.add(card);
        }
      }
      ScryfallSearchResult result = new ScryfallSearchResult(
          cards,
          response.path("total_cards").asInt(cards.size()),
          response.path("has_more").asBoolean(false));
      writeJson(cacheKey, result);
      return result;
    } catch (RuntimeException e) {
      log.warn("Scryfall search('{}') failed: {}", query, e.getMessage());
      return ScryfallSearchResult.empty();
    }
  }

  private Map<String, ScryfallCard> fetchCollection(List<String> batch) {
    Map<String, ScryfallCard> map = new LinkedHashMap<>();
    if (batch.isEmpty()) {
      return map;
    }
    try {
      List<Map<String, String>> identifiers = batch.stream()
          .map(id -> Map.of("id", id))
          .toList();
      JsonNode response = webClient.post()
          .uri("/cards/collection")
          .bodyValue(Map.of("identifiers", identifiers))
          .retrieve()
          .bodyToMono(JsonNode.class)
          .timeout(REQUEST_TIMEOUT)
          .block();
      if (response == null || !response.path("data").isArray()) {
        return map;
      }
      for (JsonNode raw : response.path("data")) {
        ScryfallCard card = cardMapper.map(raw);
        if (card != null && card.id() != null) {
          map.put(card.id(), card);
        }
      }
    } catch (RuntimeException e) {
      log.warn("Scryfall collection batch failed: {}", e.getMessage());
    }
    return map;
  }

  private ScryfallCard readCard(String key) {
    return readJson(key, ScryfallCard.class);
  }

  private <T> T readJson(String key, Class<T> type) {
    try {
      String json = redis.opsForValue().get(key);
      return json == null ? null : objectMapper.readValue(json, type);
    } catch (Exception e) {
      log.debug("Cache read miss/error for {}: {}", key, e.getMessage());
      return null;
    }
  }

  private void writeJson(String key, Object value) {
    try {
      redis.opsForValue().set(key, objectMapper.writeValueAsString(value), cacheTtl);
    } catch (Exception e) {
      log.debug("Cache write failed for {}: {}", key, e.getMessage());
    }
  }

  private static <T> List<List<T>> partition(List<T> items, int size) {
    List<List<T>> batches = new ArrayList<>();
    for (int i = 0; i < items.size(); i += size) {
      batches.add(items.subList(i, Math.min(items.size(), i + size)));
    }
    return batches;
  }
}
