package com.mtg.deckbuilder.deck.domain;

/**
 * Custom category defined for a deck. Stored inside the deck aggregate.
 */
public class DeckCategory {

  private String name;
  private String color;
  private String icon;
  private int order;

  public DeckCategory() {
  }

  public DeckCategory(String name, String color, String icon, int order) {
    this.name = name;
    this.color = color;
    this.icon = icon;
    this.order = order;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getColor() {
    return color;
  }

  public void setColor(String color) {
    this.color = color;
  }

  public String getIcon() {
    return icon;
  }

  public void setIcon(String icon) {
    this.icon = icon;
  }

  public int getOrder() {
    return order;
  }

  public void setOrder(int order) {
    this.order = order;
  }
}
