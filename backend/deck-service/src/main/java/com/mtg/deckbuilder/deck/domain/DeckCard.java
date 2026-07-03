package com.mtg.deckbuilder.deck.domain;

import java.util.List;

/**
 * A card entry embedded in a {@link Deck}. {@code scryfallId} + {@code qty} are the
 * canonical fields (per plan); the remaining fields are a denormalized snapshot from
 * Scryfall so the deck renders and stats compute without re-fetching every card.
 */
public class DeckCard {

  private String scryfallId;
  private int qty;

  // Denormalized Scryfall snapshot
  private String name;
  private String manaCost;
  private double cmc;
  private String typeLine;
  private List<String> colors;
  private String oracleText;
  private String imageUrl;
  private String category;
  /** Whether this specific printing is tracked as foil (affects the price used for it). */
  private boolean foil;

  public DeckCard() {
  }

  public DeckCard(String scryfallId, int qty) {
    this.scryfallId = scryfallId;
    this.qty = qty;
  }

  public String getScryfallId() {
    return scryfallId;
  }

  public void setScryfallId(String scryfallId) {
    this.scryfallId = scryfallId;
  }

  public int getQty() {
    return qty;
  }

  public void setQty(int qty) {
    this.qty = qty;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getManaCost() {
    return manaCost;
  }

  public void setManaCost(String manaCost) {
    this.manaCost = manaCost;
  }

  public double getCmc() {
    return cmc;
  }

  public void setCmc(double cmc) {
    this.cmc = cmc;
  }

  public String getTypeLine() {
    return typeLine;
  }

  public void setTypeLine(String typeLine) {
    this.typeLine = typeLine;
  }

  public List<String> getColors() {
    return colors;
  }

  public void setColors(List<String> colors) {
    this.colors = colors;
  }

  public String getOracleText() {
    return oracleText;
  }

  public void setOracleText(String oracleText) {
    this.oracleText = oracleText;
  }

  public String getImageUrl() {
    return imageUrl;
  }

  public void setImageUrl(String imageUrl) {
    this.imageUrl = imageUrl;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public boolean isFoil() {
    return foil;
  }

  public void setFoil(boolean foil) {
    this.foil = foil;
  }
}
