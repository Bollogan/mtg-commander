package com.mtg.deckbuilder.deck.stats;

import com.mtg.deckbuilder.deck.domain.DeckCard;
import com.mtg.deckbuilder.deck.domain.DeckStats;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Computes mana curve, type distribution and color distribution for a deck.
 * Invoked synchronously on every save. Pure / stateless — directly unit-testable.
 */
@Component
public class DeckStatsCalculator {

  private static final List<String> CMC_BUCKETS = List.of("0", "1", "2", "3", "4", "5", "6", "7+");
  private static final List<String> TYPES = List.of(
      "Creature", "Instant", "Sorcery", "Artifact", "Enchantment",
      "Planeswalker", "Land", "Battle");
  private static final List<String> COLORS = List.of("W", "U", "B", "R", "G");

  public DeckStats calculate(List<DeckCard> cards) {
    DeckStats stats = new DeckStats();

    Map<String, Integer> manaCurve = newCounter(CMC_BUCKETS);
    Map<String, Integer> typeDist = newCounter(TYPES);
    typeDist.put("Other", 0);
    Map<String, Integer> colorDist = newCounter(COLORS);
    colorDist.put("C", 0);

    int total = 0;
    double cmcWeightedSum = 0;
    int nonLandCount = 0;

    if (cards != null) {
      for (DeckCard card : cards) {
        int qty = Math.max(0, card.getQty());
        if (qty == 0) {
          continue;
        }
        total += qty;

        String type = primaryType(card.getTypeLine());
        typeDist.merge(type, qty, Integer::sum);

        boolean isLand = "Land".equals(type);
        if (!isLand) {
          String bucket = cmcBucket(card.getCmc());
          manaCurve.merge(bucket, qty, Integer::sum);
          cmcWeightedSum += card.getCmc() * qty;
          nonLandCount += qty;
        }

        for (String color : colorsOf(card)) {
          colorDist.merge(color, qty, Integer::sum);
        }
      }
    }

    stats.setTotalCards(total);
    stats.setManaCurve(manaCurve);
    stats.setTypeDistribution(typeDist);
    stats.setColorDistribution(colorDist);
    stats.setAverageCmc(nonLandCount == 0 ? 0.0
        : Math.round((cmcWeightedSum / nonLandCount) * 100.0) / 100.0);
    return stats;
  }

  private static Map<String, Integer> newCounter(List<String> keys) {
    Map<String, Integer> map = new LinkedHashMap<>();
    keys.forEach(k -> map.put(k, 0));
    return map;
  }

  static String cmcBucket(double cmc) {
    int rounded = (int) Math.floor(cmc);
    if (rounded <= 0) {
      return "0";
    }
    return rounded >= 7 ? "7+" : String.valueOf(rounded);
  }

  static String primaryType(String typeLine) {
    if (typeLine == null || typeLine.isBlank()) {
      return "Other";
    }
    String normalized = typeLine.toLowerCase(Locale.ROOT);
    // Land first so dual "Artifact — ... Land" style lines bucket as lands.
    if (normalized.contains("land")) {
      return "Land";
    }
    for (String type : TYPES) {
      if (normalized.contains(type.toLowerCase(Locale.ROOT))) {
        return type;
      }
    }
    return "Other";
  }

  /** Colors of a card; cards with no WUBRG color count as colorless "C". */
  private static List<String> colorsOf(DeckCard card) {
    List<String> colors = card.getColors();
    if (colors == null || colors.isEmpty()) {
      return List.of("C");
    }
    List<String> normalized = colors.stream()
        .map(c -> c.toUpperCase(Locale.ROOT))
        .filter(COLORS::contains)
        .toList();
    return normalized.isEmpty() ? List.of("C") : normalized;
  }
}
