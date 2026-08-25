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
import reactor.core.publisher.Mono;

/**
 * Non-blocking Scryfall client (WebClient) with a Redis read-through cache (TTL 24h).
 * Mitigates Scryfall's ~10 req/s rate limit (see plan risk matrix). The reactive call
 * is resolved at the service boundary since the rest of the stack is servlet-based.
 */
@Component
public class ScryfallClient {

  private static final Logger log = LoggerFactory.getLogger(ScryfallClient.class);
  private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);
  // v2: cache entries now also carry Scryfall prices; the bump ignores older price-less entries.
  private static final String CARD_KEY = "scryfall:card:v2:";
  private static final String NAME_KEY = "scryfall:named:";
  private static final String FUZZY_KEY = "scryfall:fuzzy:";
  private static final String SEARCH_KEY = "scryfall:search:";
  private static final String AUTOCOMPLETE_KEY = "scryfall:autocomplete:";
  private static final String COMMANDER_AUTOCOMPLETE_KEY = "scryfall:commander-autocomplete:v2:";
  private static final String COMMANDER_CHECK_KEY = "scryfall:is-commander:v1:";
  private static final String PRINTINGS_KEY = "scryfall:printings:v2:";

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

  /** Resolve a card by its exact name (used for the commander's colour identity), cached in Redis. */
  public ScryfallCard getCardByName(String name) {
    if (name == null || name.isBlank()) {
      return null;
    }
    String cacheKey = NAME_KEY + name.trim().toLowerCase();
    ScryfallCard cached = readCard(cacheKey);
    if (cached != null) {
      return cached;
    }
    try {
      JsonNode raw = webClient.get()
          .uri(uri -> uri.path("/cards/named").queryParam("exact", name).build())
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
      log.warn("Scryfall getCardByName('{}') failed: {}", name, e.getMessage());
      return null;
    }
  }

  /**
   * Resolve a card from a name that may be misspelled, abbreviated or carry an extra face
   * ("Delver of Secrets // Insectile Aberration"), using Scryfall's fuzzy matcher. Used by the
   * decklist importer, where names come from arbitrary third-party exports. Falls back to the
   * exact lookup so a name Scryfall considers ambiguous still resolves when it is spelled in full.
   */
  public ScryfallCard getCardByFuzzyName(String name) {
    if (name == null || name.isBlank()) {
      return null;
    }
    String query = frontFaceOf(name.trim());
    String cacheKey = FUZZY_KEY + query.toLowerCase();
    ScryfallCard cached = readCard(cacheKey);
    if (cached != null) {
      return cached;
    }
    try {
      JsonNode raw = webClient.get()
          .uri(uri -> uri.path("/cards/named").queryParam("fuzzy", query).build())
          // 404 = no match, 400 = too ambiguous. Both are "unresolved", not transport failures.
          .retrieve()
          .onStatus(status -> status.value() == 404 || status.value() == 400, resp -> Mono.empty())
          .bodyToMono(JsonNode.class)
          .timeout(REQUEST_TIMEOUT)
          .block();
      ScryfallCard card = cardMapper.map(raw);
      if (card == null) {
        return getCardByName(query);
      }
      writeJson(cacheKey, card);
      return card;
    } catch (RuntimeException e) {
      log.warn("Scryfall getCardByFuzzyName('{}') failed: {}", name, e.getMessage());
      return null;
    }
  }

  /**
   * Resolve many cards by exact name in as few Scryfall calls as possible (75 per
   * {@code /cards/collection} request), read-through cached per name. Names Scryfall cannot match
   * are simply absent from the result; the caller decides how to report them.
   *
   * <p>This is what makes importing a 100-card decklist one or two upstream calls instead of a
   * hundred sequential ones.
   */
  public Map<String, ScryfallCard> getCardsByNames(List<String> names) {
    Map<String, ScryfallCard> result = new LinkedHashMap<>();
    if (names == null || names.isEmpty()) {
      return result;
    }
    List<String> misses = new ArrayList<>();
    for (String name : names.stream().filter(n -> n != null && !n.isBlank()).distinct().toList()) {
      String key = name.trim().toLowerCase();
      ScryfallCard cached = readCard(NAME_KEY + key);
      if (cached != null) {
        result.put(key, cached);
      } else {
        misses.add(name.trim());
      }
    }
    for (List<String> batch : partition(misses, 75)) {
      fetchCollectionByName(batch).forEach((requested, card) -> {
        writeJson(NAME_KEY + requested.toLowerCase(), card);
        writeJson(CARD_KEY + card.id(), card);
        result.put(requested.toLowerCase(), card);
      });
    }
    return result;
  }

  /**
   * Scryfall answers a name collection with the matched cards (in request order) plus a
   * {@code not_found} list, so the reply is paired back to the requested names by matching on the
   * card's own name first and falling back to request order for the rest (a requested name can
   * differ from the printed name: "Delver of Secrets" resolves to the full double-faced name).
   */
  private Map<String, ScryfallCard> fetchCollectionByName(List<String> batch) {
    Map<String, ScryfallCard> map = new LinkedHashMap<>();
    if (batch.isEmpty()) {
      return map;
    }
    try {
      List<Map<String, String>> identifiers = batch.stream()
          .map(name -> Map.<String, String>of("name", frontFaceOf(name)))
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
      List<ScryfallCard> found = new ArrayList<>();
      for (JsonNode raw : response.path("data")) {
        ScryfallCard card = cardMapper.map(raw);
        if (card != null) {
          found.add(card);
        }
      }
      List<ScryfallCard> unclaimed = new ArrayList<>(found);
      for (String requested : batch) {
        String wanted = frontFaceOf(requested).toLowerCase();
        ScryfallCard match = unclaimed.stream()
            .filter(c -> c.name() != null
                && (c.name().toLowerCase().equals(wanted)
                    || frontFaceOf(c.name()).toLowerCase().equals(wanted)))
            .findFirst()
            .orElse(null);
        if (match != null) {
          unclaimed.remove(match);
          map.put(requested, match);
        }
      }
    } catch (RuntimeException e) {
      log.warn("Scryfall name collection batch failed: {}", e.getMessage());
    }
    return map;
  }

  /**
   * The front face of a double-faced name: Scryfall matches "Delver of Secrets" but not always
   * the full "Delver of Secrets // Insectile Aberration" that exports print.
   */
  private static String frontFaceOf(String name) {
    int split = name.indexOf("//");
    return split > 0 ? name.substring(0, split).trim() : name;
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

  /**
   * Autocomplete card names using Scryfall's /cards/autocomplete endpoint.
   * Resolves the first {@code limit} suggestions to lightweight card objects.
   * Results are cached per query.
   */
  public List<ScryfallAutocompleteItem> autocomplete(String query, int limit) {
    return autocomplete(query, limit, false);
  }

  /**
   * Autocomplete card names, optionally restricted to cards that can legally be a commander:
   * legendary creatures and planeswalkers whose oracle text says "can be your commander".
   */
  public List<ScryfallAutocompleteItem> autocomplete(String query, int limit, boolean commanderOnly) {
    if (query == null || query.isBlank()) {
      return List.of();
    }
    String trimmed = query.trim().toLowerCase();
    String cacheKey = (commanderOnly ? COMMANDER_AUTOCOMPLETE_KEY : AUTOCOMPLETE_KEY) + trimmed;
    List<ScryfallAutocompleteItem> cached = readJsonList(cacheKey, ScryfallAutocompleteItem.class);
    if (cached != null) {
      return cached;
    }

    if (commanderOnly) {
      List<ScryfallCard> cards = searchCommanders(trimmed, limit);
      List<ScryfallAutocompleteItem> items = cards.stream()
          .map(ScryfallAutocompleteItem::from)
          .filter(java.util.Objects::nonNull)
          .limit(limit)
          .toList();
      writeJson(cacheKey, items);
      return items;
    }

    List<String> names = fetchAutocompleteNames(trimmed);
    int resolvedLimit = Math.max(1, Math.min(limit, names.size()));
    List<ScryfallAutocompleteItem> items = new ArrayList<>(resolvedLimit);
    for (int i = 0; i < resolvedLimit; i++) {
      ScryfallCard card = getCardByName(names.get(i));
      ScryfallAutocompleteItem item = ScryfallAutocompleteItem.from(card);
      if (item != null) {
        items.add(item);
      }
    }
    writeJson(cacheKey, items);
    return items;
  }

  /**
   * Whether the exactly-named card is a legal commander, per Scryfall's authoritative
   * {@code is:commander} (covers legendary creatures, planeswalker/vehicle commanders like
   * Shorikai, partners, backgrounds, etc.). Cached. Returns:
   * <ul>
   *   <li>{@code TRUE}/{@code FALSE} when Scryfall gives a definitive answer,</li>
   *   <li>{@code null} when it can't be resolved (blank name, network error) so callers skip
   *       the check rather than false-flagging a valid commander.</li>
   * </ul>
   */
  public Boolean isValidCommander(String name) {
    if (name == null || name.isBlank()) {
      return null;
    }
    String key = COMMANDER_CHECK_KEY + name.trim().toLowerCase();
    String cached = redis.opsForValue().get(key);
    if (cached != null) {
      return Boolean.parseBoolean(cached);
    }
    Boolean eligible = queryIsCommander(name.trim());
    if (eligible != null) {
      try {
        redis.opsForValue().set(key, Boolean.toString(eligible), cacheTtl);
      } catch (RuntimeException e) {
        log.debug("Cache write failed for {}: {}", key, e.getMessage());
      }
    }
    return eligible;
  }

  private Boolean queryIsCommander(String name) {
    try {
      JsonNode response = webClient.get()
          .uri(uri -> uri.path("/cards/search")
              .queryParam("q", "is:commander !\"" + name + "\"")
              .queryParam("unique", "cards")
              .build())
          .retrieve()
          // Scryfall returns 404 when the query matches nothing — here that means the named
          // card exists but isn't a commander (or isn't a card): a definitive "not eligible".
          .onStatus(status -> status.value() == 404, resp -> Mono.empty())
          .bodyToMono(JsonNode.class)
          .timeout(REQUEST_TIMEOUT)
          .block();
      if (response == null || !"list".equals(response.path("object").asText())) {
        return false;
      }
      for (JsonNode raw : response.path("data")) {
        if (name.equalsIgnoreCase(raw.path("name").asText())) {
          return true;
        }
      }
      return false;
    } catch (RuntimeException e) {
      log.warn("Scryfall isValidCommander('{}') failed: {}", name, e.getMessage());
      return null; // unknown → don't false-flag
    }
  }

  private List<ScryfallCard> searchCommanders(String query, int limit) {
    try {
      // Scryfall's `is:commander` already covers legendary creatures and the planeswalkers /
      // cards that can be a commander. Bare words match card names and tolerate partial,
      // multi-word input far better than an anchored regex (which missed names with commas).
      String q = "is:commander " + query;
      JsonNode response = webClient.get()
          .uri(uri -> uri.path("/cards/search")
              .queryParam("q", q)
              .queryParam("unique", "cards")
              .queryParam("order", "name")
              .queryParam("page", 1)
              .build())
          .retrieve()
          // Scryfall returns HTTP 404 when a query matches nothing — that's an empty result,
          // not an error, so swallow it and let the body/object check yield an empty list.
          .onStatus(status -> status.value() == 404, resp -> Mono.empty())
          .bodyToMono(JsonNode.class)
          .timeout(REQUEST_TIMEOUT)
          .block();

      if (response == null || !"list".equals(response.path("object").asText())) {
        return List.of();
      }
      List<ScryfallCard> cards = new ArrayList<>();
      for (JsonNode raw : response.path("data")) {
        ScryfallCard card = cardMapper.map(raw);
        if (card != null) {
          cards.add(card);
        }
        if (cards.size() >= limit) {
          break;
        }
      }
      return cards;
    } catch (RuntimeException e) {
      log.warn("Scryfall commander autocomplete('{}') failed: {}", query, e.getMessage());
      return List.of();
    }
  }

  private List<String> fetchAutocompleteNames(String query) {
    try {
      JsonNode response = webClient.get()
          .uri(uri -> uri.path("/cards/autocomplete")
              .queryParam("q", query)
              .build())
          .retrieve()
          .bodyToMono(JsonNode.class)
          .timeout(REQUEST_TIMEOUT)
          .block();

      if (response == null || !"catalog".equals(response.path("object").asText())) {
        return List.of();
      }
      List<String> names = new ArrayList<>();
      for (JsonNode node : response.path("data")) {
        if (node.isTextual()) {
          names.add(node.asText());
        }
      }
      return names;
    } catch (RuntimeException e) {
      log.warn("Scryfall autocomplete('{}') failed: {}", query, e.getMessage());
      return List.of();
    }
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
          // A no-match search returns HTTP 404 from Scryfall; treat it as an empty result.
          .onStatus(status -> status.value() == 404, resp -> Mono.empty())
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

  /**
   * All printings of a card, identified by its exact name, newest first. Cached per name.
   * Used by the deck builder's "change printing" picker. Each printing carries its own id,
   * set name, image and prices so the UI can swap the tracked printing.
   */
  public List<ScryfallCard> getPrintings(String name) {
    if (name == null || name.isBlank()) {
      return List.of();
    }
    String cacheKey = PRINTINGS_KEY + name.trim().toLowerCase();
    List<ScryfallCard> cached = readJsonList(cacheKey, ScryfallCard.class);
    if (cached != null) {
      return cached;
    }
    try {
      JsonNode response = webClient.get()
          .uri(uri -> uri.path("/cards/search")
              .queryParam("q", "!\"" + name + "\"")
              .queryParam("unique", "prints")
              .queryParam("order", "released")
              .build())
          .retrieve()
          // No printings (unknown name) → Scryfall returns 404; treat as empty.
          .onStatus(status -> status.value() == 404, resp -> Mono.empty())
          .bodyToMono(JsonNode.class)
          .timeout(REQUEST_TIMEOUT)
          .block();
      if (response == null || !"list".equals(response.path("object").asText())) {
        return List.of();
      }
      List<ScryfallCard> cards = new ArrayList<>();
      for (JsonNode raw : response.path("data")) {
        ScryfallCard card = cardMapper.map(raw);
        if (card != null) {
          cards.add(card);
        }
      }
      writeJson(cacheKey, cards);
      return cards;
    } catch (RuntimeException e) {
      log.warn("Scryfall getPrintings('{}') failed: {}", name, e.getMessage());
      return List.of();
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

  /**
   * Reads a cached JSON array into a properly-typed {@code List<T>}. Deserializing into the
   * concrete element type (rather than {@code List.class}) is essential: otherwise the elements
   * come back as generic maps and Spring fails to serialize the response as the declared record
   * type ("object is not an instance of declaring class").
   */
  private <T> List<T> readJsonList(String key, Class<T> elementType) {
    try {
      String json = redis.opsForValue().get(key);
      if (json == null) {
        return null;
      }
      return objectMapper.readValue(json,
          objectMapper.getTypeFactory().constructCollectionType(List.class, elementType));
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
