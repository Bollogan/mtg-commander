package com.mtg.deckbuilder.game.domain;

import java.util.UUID;

/**
 * A card instance in a game. {@code instanceId} is unique per physical copy (so duplicates
 * are addressable on the battlefield); {@code scryfallId} identifies the printing.
 */
public class GameCard {

  private String instanceId;
  private String scryfallId;
  private String name;
  private String typeLine;
  private String imageUrl;
  private boolean tapped;

  public GameCard() {
  }

  public GameCard(String scryfallId, String name, String typeLine, String imageUrl) {
    this.instanceId = UUID.randomUUID().toString();
    this.scryfallId = scryfallId;
    this.name = name;
    this.typeLine = typeLine;
    this.imageUrl = imageUrl;
    this.tapped = false;
  }

  public String getInstanceId() {
    return instanceId;
  }

  public void setInstanceId(String instanceId) {
    this.instanceId = instanceId;
  }

  public String getScryfallId() {
    return scryfallId;
  }

  public void setScryfallId(String scryfallId) {
    this.scryfallId = scryfallId;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getTypeLine() {
    return typeLine;
  }

  public void setTypeLine(String typeLine) {
    this.typeLine = typeLine;
  }

  public String getImageUrl() {
    return imageUrl;
  }

  public void setImageUrl(String imageUrl) {
    this.imageUrl = imageUrl;
  }

  public boolean isTapped() {
    return tapped;
  }

  public void setTapped(boolean tapped) {
    this.tapped = tapped;
  }
}
