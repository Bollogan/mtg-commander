package com.mtg.deckbuilder.deck.scryfall;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/** Maps raw Scryfall JSON nodes into the trimmed {@link ScryfallCard}. */
@Component
public class ScryfallCardMapper {

  public ScryfallCard map(JsonNode raw) {
    if (raw == null || raw.isMissingNode() || raw.isNull()) {
      return null;
    }
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
    String oracleText = textOr(raw, "oracle_text", textOr(face, "oracle_text", ""));
    String power = textOr(raw, "power", textOr(face, "power", null));
    String toughness = textOr(raw, "toughness", textOr(face, "toughness", null));
    String setName = textOr(raw, "set_name", textOr(raw, "set", "Unknown Set"));
    String rarity = textOr(raw, "rarity", "unknown");
    ScryfallCard.ImageUris imageUris = mapImageUris(raw, face);

    return new ScryfallCard(id, name, manaCost, cmc, colors, colorIdentity, typeLine,
        oracleText, power, toughness, imageUris, setName, rarity);
  }

  private ScryfallCard.ImageUris mapImageUris(JsonNode raw, JsonNode face) {
    JsonNode imageNode = raw.path("image_uris").isObject() ? raw.path("image_uris") : null;
    if (imageNode == null && face != null && face.path("image_uris").isObject()) {
      imageNode = face.path("image_uris");
    }
    if (imageNode == null) {
      return null;
    }
    return new ScryfallCard.ImageUris(
        textOr(imageNode, "small", null),
        textOr(imageNode, "normal", null),
        textOr(imageNode, "large", null),
        textOr(imageNode, "art_crop", null));
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

  private List<String> arrayOr(JsonNode node, String field, JsonNode fallbackNode,
      String fallbackField) {
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
}
