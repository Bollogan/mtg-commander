package com.mtg.deckbuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.mtg.deckbuilder.dto.CardDto;
import com.mtg.deckbuilder.dto.RecommanderCategoryDto;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.regex.Pattern;
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
 *
 * <p>On top of the raw ranked list it reproduces recommander.cards' own breakdown of a
 * commander's recommendations into "apartados" — Top Picks, Creatures, Artifacts,
 * Enchantments, Instants, Sorceries, Planeswalkers, Battles, Utility Lands and Lands —
 * which is finer-grained than a plain card-type split (notably the utility/plain land
 * distinction). See {@link #recommendCategories(String, int)}.
 */
@Service
public class RecommanderService {

  private static final Logger log = LoggerFactory.getLogger(RecommanderService.class);
  private static final String BASE_URL = "https://api.recommander.cards/public-release";

  /** recommander.cards shows at most 50 cards per apartado. */
  public static final int DEFAULT_PER_CATEGORY = 50;
  /**
   * Ceiling on the ranked list we consume. The public API answers one flat, score-ordered list
   * capped at ~200 cards (the site itself queries per category, which the public release does not
   * expose), so the thinner apartados — lands especially — hold fewer cards here than on
   * recommander.cards. Raising this only helps if upstream ever returns more.
   */
  private static final int MAX_RECOMMENDATIONS = 400;
  /** Upper bound on the decklist forwarded upstream; a Commander deck has 99 distinct cards. */
  private static final int MAX_DECK_CARDS = 250;

  private static final Duration CACHE_TTL = Duration.ofMinutes(30);

  /**
   * Category ids in the order recommander.cards presents them. {@code top} is not a card type:
   * it is the highest-scored cards across every type.
   */
  private static final Map<String, String> CATEGORY_LABELS = new LinkedHashMap<>();

  static {
    CATEGORY_LABELS.put("top", "Top Picks");
    CATEGORY_LABELS.put("creatures", "Creatures");
    CATEGORY_LABELS.put("artifacts", "Artifacts");
    CATEGORY_LABELS.put("enchantments", "Enchantments");
    CATEGORY_LABELS.put("instants", "Instants");
    CATEGORY_LABELS.put("sorceries", "Sorceries");
    CATEGORY_LABELS.put("planeswalkers", "Planeswalkers");
    CATEGORY_LABELS.put("battles", "Battles");
    CATEGORY_LABELS.put("utility-lands", "Utility Lands");
    CATEGORY_LABELS.put("lands", "Lands");
    CATEGORY_LABELS.put("other", "Other");
  }

  // A land line that only produces or fixes mana does not make the land a "utility" land: an
  // activated ability whose effect is "Add ...", an enters-tapped clause, a land-type grant, or
  // a fetch for another land. Anything else does.
  private static final Pattern MANA_ABILITY = Pattern.compile("(?i).*:\\s*add\\b.*");
  private static final Pattern ENTERS_TAPPED =
      Pattern.compile("(?i)^[^:]*\\benters\\b[^:]*\\btapped\\b[^:]*$");
  private static final Pattern LAND_TYPES = Pattern.compile("(?i).*\\bis a\\b.*\\bin addition\\b.*");
  // Fetchlands name what they search for by land type ("a Plains or Island card"), not always by
  // the word "land", so both spellings count as mana fixing rather than utility.
  private static final Pattern FETCH_LAND = Pattern.compile(
      "(?i).*search your library for .*\\b(land|plains|island|swamp|mountain|forest)\\b.*");
  private static final Pattern REMINDER = Pattern.compile("\\([^)]*\\)");

  private final RestClient client;
  private final ScryfallService scryfallService;
  private final Map<String, CachedRecommendations> cache = new ConcurrentHashMap<>();

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
    return recommendForCommander(commanderName, limit, List.of());
  }

  /** As above, with the current decklist so the model can tune to what the deck already does. */
  public List<CardDto> recommendForCommander(String commanderName, int limit, List<String> deck) {
    List<CardDto> ranked = rankedCards(commanderName, deck);
    if (limit > 0 && ranked.size() > limit) {
      return List.copyOf(ranked.subList(0, limit));
    }
    return ranked;
  }

  public List<RecommanderCategoryDto> recommendCategories(String commanderName, int perCategory) {
    return recommendCategories(commanderName, perCategory, List.of());
  }

  /**
   * The same recommendations, split into recommander.cards' apartados and capped at
   * {@code perCategory} cards each. Empty categories are omitted, and the order is the one the
   * site uses (Top Picks first, Lands last).
   *
   * <p>Passing {@code deck} switches the model from "what goes with this commander" to "what
   * goes with <em>this</em> deck": the answers change almost completely (measured on a real
   * list: 15 of 200 cards in common), come back with far higher confidence, and upstream already
   * filters out everything the deck runs. An empty list is equivalent to not sending one.
   */
  public List<RecommanderCategoryDto> recommendCategories(
      String commanderName, int perCategory, List<String> deck) {
    List<CardDto> ranked = rankedCards(commanderName, deck);
    if (ranked.isEmpty()) {
      return List.of();
    }
    int cap = perCategory > 0 ? perCategory : DEFAULT_PER_CATEGORY;

    Map<String, List<CardDto>> buckets = new LinkedHashMap<>();
    CATEGORY_LABELS.keySet().forEach(id -> buckets.put(id, new ArrayList<>()));

    // "Top Picks" is the ranked head across every type; the rest are the per-type apartados.
    List<CardDto> top = buckets.get("top");
    for (CardDto card : ranked) {
      if (top.size() < cap) {
        top.add(card);
      }
      List<CardDto> bucket = buckets.get(categoryOf(card));
      if (bucket.size() < cap) {
        bucket.add(card);
      }
    }

    List<RecommanderCategoryDto> categories = new ArrayList<>();
    buckets.forEach((id, cards) -> {
      if (!cards.isEmpty()) {
        categories.add(new RecommanderCategoryDto(id, CATEGORY_LABELS.get(id), List.copyOf(cards)));
      }
    });
    return categories;
  }

  /** The full ranked list for a commander (and optional decklist), memoised for {@link #CACHE_TTL}. */
  private List<CardDto> rankedCards(String commanderName, List<String> deck) {
    if (commanderName == null || commanderName.isBlank()) {
      return List.of();
    }
    List<String> cleanDeck = cleanDeck(deck);
    String key = commanderName.trim().toLowerCase(Locale.ROOT) + "|" + deckSignature(cleanDeck);
    CachedRecommendations cached = cache.get(key);
    if (cached != null && !cached.isExpired()) {
      return cached.cards();
    }

    List<String> names = fetchRecommendedNames(commanderName.trim(), cleanDeck);
    List<CardDto> cards = names.isEmpty() ? List.<CardDto>of() : scryfallService.getCardsByNames(names);
    // Only memoise real answers: an upstream hiccup must not pin an empty list for 30 minutes.
    if (!cards.isEmpty()) {
      cache.put(key, new CachedRecommendations(cards, Instant.now().plus(CACHE_TTL)));
    }
    return cards;
  }

  private List<String> fetchRecommendedNames(String commanderName, List<String> deck) {
    try {
      JsonNode response = client.post()
          .uri("/api/decks/recommend/top")
          .body(Map.of("card_format", "name", "commander", commanderName, "deck", deck))
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
        if (names.size() >= MAX_RECOMMENDATIONS) {
          break;
        }
      }
      return names;
    } catch (RuntimeException e) {
      log.warn("recommander request failed for '{}': {}", commanderName, e.getMessage());
      return List.of();
    }
  }

  /**
   * Normalises the decklist we forward upstream: no blanks, no duplicates (a basic land counts
   * once) and bounded, so a pathological request cannot balloon the call.
   */
  static List<String> cleanDeck(List<String> deck) {
    if (deck == null || deck.isEmpty()) {
      return List.of();
    }
    return deck.stream()
        .filter(name -> name != null && !name.isBlank())
        .map(String::trim)
        .distinct()
        .limit(MAX_DECK_CARDS)
        .toList();
  }

  /**
   * Cache discriminator for a decklist. Order must not matter — the same 99 cards in a different
   * order is the same query — so the names are sorted before hashing.
   */
  static String deckSignature(List<String> deck) {
    if (deck.isEmpty()) {
      return "no-deck";
    }
    String joined = deck.stream()
        .map(name -> name.toLowerCase(Locale.ROOT))
        .sorted()
        .collect(Collectors.joining("\u0000"));
    return UUID.nameUUIDFromBytes(joined.getBytes(StandardCharsets.UTF_8)).toString();
  }

  /**
   * The apartado a card belongs to. Only the front face counts, so a modal double-faced spell
   * with a land back (Agadeem's Awakening) is filed as the spell it is cast as.
   */
  static String categoryOf(CardDto card) {
    String typeLine = card.type_line() == null ? "" : card.type_line();
    String front = typeLine.split("//")[0].toLowerCase(Locale.ROOT);

    if (front.contains("land")) {
      return isUtilityLand(front, card.oracle_text()) ? "utility-lands" : "lands";
    }
    if (front.contains("creature")) {
      return "creatures";
    }
    if (front.contains("planeswalker")) {
      return "planeswalkers";
    }
    if (front.contains("battle")) {
      return "battles";
    }
    if (front.contains("instant")) {
      return "instants";
    }
    if (front.contains("sorcery")) {
      return "sorceries";
    }
    if (front.contains("artifact")) {
      return "artifacts";
    }
    if (front.contains("enchantment")) {
      return "enchantments";
    }
    return "other";
  }

  /**
   * A land is a "utility land" when it does something beyond producing or fixing mana — that is,
   * when any line of its rules text is neither a mana ability, an enters-tapped clause, a
   * land-type grant, nor a land fetch. Basic lands are never utility lands.
   */
  static boolean isUtilityLand(String lowerFrontTypeLine, String oracleText) {
    if (lowerFrontTypeLine.contains("basic")) {
      return false;
    }
    if (oracleText == null || oracleText.isBlank()) {
      return false;
    }
    for (String rawLine : oracleText.split("\\r?\\n")) {
      String line = REMINDER.matcher(rawLine).replaceAll(" ").trim();
      if (line.isEmpty()
          || MANA_ABILITY.matcher(line).matches()
          || ENTERS_TAPPED.matcher(line).matches()
          || LAND_TYPES.matcher(line).matches()
          || FETCH_LAND.matcher(line).matches()) {
        continue;
      }
      return true;
    }
    return false;
  }

  private record CachedRecommendations(List<CardDto> cards, Instant expiresAt) {
    boolean isExpired() {
      return Instant.now().isAfter(expiresAt);
    }
  }
}
