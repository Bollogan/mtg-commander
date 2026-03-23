package com.mtg.deckbuilder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtg.deckbuilder.dto.CardDto;
import com.mtg.deckbuilder.dto.EdhrecCategoryDto;
import com.mtg.deckbuilder.dto.SearchResponseDto;
import com.mtg.deckbuilder.dto.TopCommanderDto;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class ScryfallService {
  private static final Logger logger = LoggerFactory.getLogger(ScryfallService.class);
  private static final int UI_PAGE_SIZE = 20;
  private static final int SCRYFALL_PAGE_SIZE = 175;
  private final RestClient scryfallClient;
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient;

  public ScryfallService(RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
    this.scryfallClient = restClientBuilder.baseUrl("https://api.scryfall.com").build();
    this.objectMapper = objectMapper;
    this.httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build();
  }

  public SearchResponseDto searchCards(String query, int page) {
    int safePage = Math.max(1, page);
    int offset = (safePage - 1) * UI_PAGE_SIZE;
    int scryfallPage = (offset / SCRYFALL_PAGE_SIZE) + 1;
    int offsetInPage = offset % SCRYFALL_PAGE_SIZE;

    try {
      JsonNode response = fetchScryfallSearchPage(query, scryfallPage);
      if (response == null || !"list".equals(response.path("object").asText())) {
        return new SearchResponseDto(List.of(), safePage, UI_PAGE_SIZE, 0, false);
      }

      int totalCards = response.path("total_cards").asInt(0);
      List<JsonNode> combined = new ArrayList<>();
      JsonNode dataNode = response.path("data");
      if (dataNode.isArray()) {
        dataNode.forEach(combined::add);
      }

      boolean hasMore = response.path("has_more").asBoolean(false);
      int nextPage = scryfallPage + 1;
      while (combined.size() < offsetInPage + UI_PAGE_SIZE && hasMore) {
        JsonNode nextResponse = fetchScryfallSearchPage(query, nextPage);
        if (nextResponse == null || !"list".equals(nextResponse.path("object").asText())) {
          break;
        }
        JsonNode nextData = nextResponse.path("data");
        if (nextData.isArray()) {
          nextData.forEach(combined::add);
        }
        hasMore = nextResponse.path("has_more").asBoolean(false);
        nextPage++;
      }

      if (offsetInPage >= combined.size()) {
        return new SearchResponseDto(List.of(), safePage, UI_PAGE_SIZE, totalCards, false);
      }

      int end = Math.min(offsetInPage + UI_PAGE_SIZE, combined.size());
      List<CardDto> cards = new ArrayList<>();
      for (int i = offsetInPage; i < end; i++) {
        cards.add(mapToCard(combined.get(i)));
      }

      boolean uiHasMore = totalCards > 0
          ? (safePage * UI_PAGE_SIZE) < totalCards
          : hasMore;

      return new SearchResponseDto(cards, safePage, UI_PAGE_SIZE, totalCards, uiHasMore);
    } catch (Exception ex) {
      logger.error("Error en Scryfall search", ex);
      return new SearchResponseDto(List.of(), safePage, UI_PAGE_SIZE, 0, false);
    }
  }

  private JsonNode fetchScryfallSearchPage(String query, int page) {
    return scryfallClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/cards/search")
            .queryParam("q", query)
            .queryParam("unique", "prints")
            .queryParam("order", "released")
            .queryParam("dir", "desc")
            .queryParam("include_extras", "false")
            .queryParam("include_variations", "false")
            .queryParam("page", page)
            .build())
        .retrieve()
        .onStatus(HttpStatusCode::isError, (request, responseSpec) -> {
          logger.warn("Scryfall error: {}", responseSpec.getStatusCode());
        })
        .body(JsonNode.class);
  }

  public List<TopCommanderDto> fetchTopCommanders(int limit) {
    return fetchTopCommandersFromScryfall(limit).stream()
        .map(card -> new TopCommanderDto(card, 0))
        .collect(Collectors.toList());
  }
  public List<CardDto> getCardsByIds(List<String> ids) {
    if (ids == null || ids.isEmpty()) {
      return List.of();
    }

    Map<String, CardDto> cardMap = fetchCardsByIds(ids);
    return ids.stream()
        .map(cardMap::get)
        .filter(Objects::nonNull)
        .collect(Collectors.toList());
  }

  public CardDto getCardById(String id) {
    try {
      JsonNode response = scryfallClient.get()
          .uri(uriBuilder -> uriBuilder.path("/cards/{id}").build(id))
          .retrieve()
          .body(JsonNode.class);

      if (response == null || response.isMissingNode()) {
        return null;
      }
      return mapToCard(response);
    } catch (Exception ex) {
      logger.error("Error fetching card by id {}", id, ex);
      return null;
    }
  }

  public List<CardDto> getRelatedCards(String id) {
    try {
      JsonNode response = scryfallClient.get()
          .uri(uriBuilder -> uriBuilder.path("/cards/{id}").build(id))
          .retrieve()
          .body(JsonNode.class);

      if (response == null || response.isMissingNode()) {
        return List.of();
      }

      JsonNode allParts = response.path("all_parts");
      if (!allParts.isArray()) {
        return List.of();
      }

      List<CardDto> related = new ArrayList<>();
      for (JsonNode part : allParts) {
        String uri = part.path("uri").asText(null);
        if (uri == null || uri.isBlank()) {
          continue;
        }
        try {
          JsonNode partNode = scryfallClient.get().uri(uri).retrieve().body(JsonNode.class);
          if (partNode != null) {
            related.add(mapToCard(partNode));
          }
        } catch (Exception ex) {
          logger.warn("Failed to fetch related card from {}", uri);
        }
      }

      return related;
    } catch (Exception ex) {
      logger.error("Error fetching related cards for {}", id, ex);
      return List.of();
    }
  }


  private List<CardDto> fetchTopCommandersFromScryfall(int limit) {
    try {
      JsonNode response = scryfallClient.get()
          .uri(uriBuilder -> uriBuilder
              .path("/cards/search")
              .queryParam("q", "t:legendary t:creature legal:commander -is:funny")
              .queryParam("unique", "cards")
              .queryParam("order", "edhrec")
              .queryParam("dir", "asc")
              .queryParam("include_extras", "false")
              .queryParam("include_variations", "false")
              .build())
          .retrieve()
          .body(JsonNode.class);

      if (response == null || !"list".equals(response.path("object").asText())) {
        return List.of();
      }

      List<CardDto> mapped = new ArrayList<>();
      for (JsonNode raw : response.path("data")) {
        mapped.add(mapToCard(raw));
      }

      return mapped.stream().limit(limit).collect(Collectors.toList());
    } catch (Exception ex) {
      logger.error("Error fetching top commanders", ex);
      return List.of();
    }
  }

  private List<String> extractEdhrecCommanderIds(JsonNode response, int limit) {
    List<String> ids = new ArrayList<>();
    JsonNode jsonDict = response.path("container").path("json_dict");

    JsonNode cardlists = jsonDict.path("cardlists");
    if (cardlists.isArray()) {
      for (JsonNode cardlist : cardlists) {
        collectIdsFromCardviews(cardlist.path("cardviews"), ids, limit);
        if (limit > 0 && ids.size() >= limit) {
          return ids.subList(0, limit);
        }
      }
    }

    if (ids.isEmpty()) {
      JsonNode commanders = jsonDict.path("commanders");
      if (commanders.isArray()) {
        for (JsonNode commander : commanders) {
          String id = textOr(commander, "id", null);
          if (id != null && !id.isBlank()) {
            ids.add(id);
          } else {
            collectIdsFromCardviews(commander.path("cardviews"), ids, limit);
          }
          if (limit > 0 && ids.size() >= limit) {
            return ids.subList(0, limit);
          }
        }
      }
    }

    return limit > 0 && ids.size() > limit ? ids.subList(0, limit) : ids;
  }

  private void collectIdsFromCardviews(JsonNode cardviews, List<String> ids, int limit) {
    if (!cardviews.isArray()) {
      return;
    }

    for (JsonNode cardview : cardviews) {
      String id = textOr(cardview, "id", null);
      if (id != null && !id.isBlank()) {
        ids.add(id);
      }
      if (limit > 0 && ids.size() >= limit) {
        return;
      }
    }
  }

  private JsonNode fetchEdhrecJson(String path) {
    try {
      String url = "https://json.edhrec.com" + path;
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(url))
          .timeout(Duration.ofSeconds(15))
          .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
          .header("Accept", "application/json,text/plain,*/*")
          .header("Accept-Language", "en-US,en;q=0.9,es;q=0.8")
          .header("Referer", "https://edhrec.com/")
          .header("Origin", "https://edhrec.com")
          .GET()
          .build();

      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 200 && response.statusCode() < 300 && response.body() != null) {
        return objectMapper.readTree(response.body());
      }
    } catch (Exception ex) {
      logger.warn("EDHREC direct fetch failed for {}", path, ex);
    }

    return null;
  }

  public List<EdhrecCategoryDto> getEdhrecCommanderCategories(String slug, int limit) {
    try {
      JsonNode response = fetchEdhrecJson("/pages/commanders/" + slug + ".json");

      if (response == null) {
        return List.of();
      }

      JsonNode cardlists = response.path("container").path("json_dict").path("cardlists");
      if (!cardlists.isArray()) {
        return List.of();
      }

      List<EdhrecCategoryDto> categories = new ArrayList<>();
      List<List<String>> categoryIds = new ArrayList<>();
      List<String> allIds = new ArrayList<>();

      for (JsonNode cardlist : cardlists) {
        String header = textOr(cardlist, "header", "");
        String tag = textOr(cardlist, "tag", "");
        JsonNode cardviews = cardlist.path("cardviews");
        if (!cardviews.isArray()) {
          continue;
        }

        List<String> ids = new ArrayList<>();
        for (JsonNode cardview : cardviews) {
          String id = textOr(cardview, "id", null);
          if (id != null && !id.isBlank()) {
            ids.add(id);
          }
          if (limit > 0 && ids.size() >= limit) {
            break;
          }
        }

        allIds.addAll(ids);
        categoryIds.add(ids);
        categories.add(new EdhrecCategoryDto(header, tag, List.of()));
      }

      Map<String, CardDto> cardMap = fetchCardsByIds(allIds);
      List<EdhrecCategoryDto> enriched = new ArrayList<>();

      for (int i = 0; i < categories.size(); i++) {
        EdhrecCategoryDto category = categories.get(i);
        List<String> ids = categoryIds.get(i);
        List<CardDto> cards = new ArrayList<>();

        for (String id : ids) {
          if (id == null || id.isBlank()) {
            continue;
          }
          CardDto card = cardMap.get(id);
          if (card != null) {
            cards.add(card);
          }
          if (limit > 0 && cards.size() >= limit) {
            break;
          }
        }

        enriched.add(new EdhrecCategoryDto(category.header(), category.tag(), cards));
      }

      return enriched;
    } catch (Exception ex) {
      logger.error("Error fetching EDHREC categories for {}", slug, ex);
      return List.of();
    }
  }

  private CardDto mapToCard(JsonNode raw) {
    JsonNode face = raw.path("card_faces").isArray() && raw.path("card_faces").size() > 0
        ? raw.path("card_faces").get(0)
        : null;

    String id = textOr(raw, "id", textOr(raw, "oracle_id", "unknown"));
    String name = textOr(raw, "name", "Unknown Card");
    String manaCost = textOr(raw, "mana_cost", textOr(face, "mana_cost", ""));
    double cmc = numberOr(raw, "cmc", numberOr(face, "cmc", 0));
    List<String> colors = arrayOr(raw, "colors", face, "colors");
    List<String> colorIdentity = arrayOr(raw, "color_identity", face, "color_identity");
    String typeLine = textOr(raw, "type_line", textOr(face, "type_line", ""));
    String oracleText = textOr(raw, "oracle_text", textOr(face, "oracle_text", textOr(raw, "flavor_text", "")));
    String power = textOr(raw, "power", textOr(face, "power", null));
    String toughness = textOr(raw, "toughness", textOr(face, "toughness", null));
    CardDto.ImageUris imageUris = mapImageUris(raw, face);
    String setName = textOr(raw, "set_name", textOr(raw, "set", "Unknown Set"));
    String rarity = textOr(raw, "rarity", "unknown");
    Map<String, String> legalities = objectToMap(raw.path("legalities"));
    Map<String, String> relatedUris = objectToMap(raw.path("related_uris"));
    String artist = textOr(raw, "artist", null);
    String releasedAt = textOr(raw, "released_at", null);
    Map<String, String> prices = objectToMap(raw.path("prices"));

    return new CardDto(
        id,
        name,
        manaCost,
        cmc,
        colors,
        colorIdentity,
        typeLine,
        oracleText,
        power,
        toughness,
        imageUris,
        setName,
        rarity,
        legalities,
        relatedUris,
        artist,
        releasedAt,
        prices
    );
  }

  private Map<String, CardDto> fetchCardsByIds(List<String> ids) {
    if (ids == null || ids.isEmpty()) {
      return Map.of();
    }

    Map<String, CardDto> result = new HashMap<>();
    List<List<String>> batches = partition(ids.stream().distinct().collect(Collectors.toList()), 75);

    for (List<String> batch : batches) {
      try {
        List<Map<String, String>> identifiers = batch.stream()
            .map(id -> Map.of("id", id))
            .collect(Collectors.toList());

        JsonNode response = scryfallClient.post()
            .uri("/cards/collection")
            .body(Map.of("identifiers", identifiers))
            .retrieve()
            .body(JsonNode.class);

        if (response == null || !response.path("data").isArray()) {
          continue;
        }

        for (JsonNode raw : response.path("data")) {
          CardDto mapped = mapToCard(raw);
          if (mapped != null && mapped.id() != null) {
            result.put(mapped.id(), mapped);
          }
        }
      } catch (Exception ex) {
        logger.warn("Failed to fetch Scryfall collection batch", ex);
      }
    }

    return result;
  }

  private List<List<String>> partition(List<String> items, int size) {
    List<List<String>> batches = new ArrayList<>();
    if (items == null || items.isEmpty() || size <= 0) {
      return batches;
    }

    for (int i = 0; i < items.size(); i += size) {
      int end = Math.min(items.size(), i + size);
      batches.add(items.subList(i, end));
    }

    return batches;
  }

  private CardDto.ImageUris mapImageUris(JsonNode raw, JsonNode face) {
    JsonNode imageNode = raw.path("image_uris").isObject() ? raw.path("image_uris") : null;
    if (imageNode == null && face != null && face.path("image_uris").isObject()) {
      imageNode = face.path("image_uris");
    }
    if (imageNode == null) {
      return null;
    }

    return new CardDto.ImageUris(
        textOr(imageNode, "small", null),
        textOr(imageNode, "normal", null),
        textOr(imageNode, "large", null),
        textOr(imageNode, "png", null),
        textOr(imageNode, "art_crop", null),
        textOr(imageNode, "border_crop", null)
    );
  }

  private String textOr(JsonNode node, String field, String fallback) {
    if (node == null) {
      return fallback;
    }
    JsonNode value = node.path(field);
    return value.isMissingNode() || value.isNull() ? fallback : value.asText(fallback);
  }

  private double numberOr(JsonNode node, String field, double fallback) {
    if (node == null) {
      return fallback;
    }
    JsonNode value = node.path(field);
    return value.isNumber() ? value.asDouble() : fallback;
  }


  private List<String> arrayOr(JsonNode node, String field, JsonNode fallbackNode, String fallbackField) {
    JsonNode value = node != null ? node.path(field) : null;
    if (value == null || !value.isArray()) {
      value = fallbackNode != null ? fallbackNode.path(fallbackField) : null;
    }
    if (value == null || !value.isArray()) {
      return List.of();
    }

    List<String> result = new ArrayList<>();
    for (JsonNode item : value) {
      result.add(item.asText());
    }
    return result;
  }

  private Map<String, String> objectToMap(JsonNode node) {
    if (node == null || !node.isObject()) {
      return Map.of();
    }
    Map<String, String> map = new HashMap<>();
    node.fields().forEachRemaining(entry -> map.put(entry.getKey(), entry.getValue().asText()));
    return map;
  }
}
