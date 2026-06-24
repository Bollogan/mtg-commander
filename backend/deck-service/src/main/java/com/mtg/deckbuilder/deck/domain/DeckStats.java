package com.mtg.deckbuilder.deck.domain;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Aggregated, denormalized statistics for a deck. Recomputed by
 * {@code DeckStatsCalculator} on every save. Synergies are filled in asynchronously.
 */
public class DeckStats {

  private int totalCards;
  /** CMC bucket ("0".."6","7+") to card count, lands excluded. */
  private Map<String, Integer> manaCurve = new LinkedHashMap<>();
  /** Primary card type to card count. */
  private Map<String, Integer> typeDistribution = new LinkedHashMap<>();
  /** Color symbol (W/U/B/R/G/C) to card count. */
  private Map<String, Integer> colorDistribution = new LinkedHashMap<>();
  /** Top keyword synergies detected by co-occurrence in Oracle text. */
  private List<KeywordSynergy> synergies = List.of();
  private double averageCmc;

  public int getTotalCards() {
    return totalCards;
  }

  public void setTotalCards(int totalCards) {
    this.totalCards = totalCards;
  }

  public Map<String, Integer> getManaCurve() {
    return manaCurve;
  }

  public void setManaCurve(Map<String, Integer> manaCurve) {
    this.manaCurve = manaCurve;
  }

  public Map<String, Integer> getTypeDistribution() {
    return typeDistribution;
  }

  public void setTypeDistribution(Map<String, Integer> typeDistribution) {
    this.typeDistribution = typeDistribution;
  }

  public Map<String, Integer> getColorDistribution() {
    return colorDistribution;
  }

  public void setColorDistribution(Map<String, Integer> colorDistribution) {
    this.colorDistribution = colorDistribution;
  }

  public List<KeywordSynergy> getSynergies() {
    return synergies;
  }

  public void setSynergies(List<KeywordSynergy> synergies) {
    this.synergies = synergies;
  }

  public double getAverageCmc() {
    return averageCmc;
  }

  public void setAverageCmc(double averageCmc) {
    this.averageCmc = averageCmc;
  }

  /** A keyword that appears in multiple cards, with how many cards share it. */
  public record KeywordSynergy(String keyword, int cardCount) {
  }
}
