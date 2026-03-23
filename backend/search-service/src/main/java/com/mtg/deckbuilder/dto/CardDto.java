package com.mtg.deckbuilder.dto;

import java.util.List;
import java.util.Map;

public record CardDto(
    String id,
    String name,
    String mana_cost,
    double cmc,
    List<String> colors,
    List<String> color_identity,
    String type_line,
    String oracle_text,
    String power,
    String toughness,
    ImageUris image_uris,
    String set_name,
    String rarity,
    Map<String, String> legalities,
    Map<String, String> related_uris,
    String artist,
    String released_at,
    Map<String, String> prices
) {
  public record ImageUris(
      String small,
      String normal,
      String large,
      String png,
      String art_crop,
      String border_crop
  ) {}
}
