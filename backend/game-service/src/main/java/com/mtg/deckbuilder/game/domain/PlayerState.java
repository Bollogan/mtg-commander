package com.mtg.deckbuilder.game.domain;

import java.util.ArrayList;
import java.util.List;

/** Per-player zones and counters. The library is the single source of card order. */
public class PlayerState {

  private String playerId;
  private String playerName;
  private List<GameCard> library = new ArrayList<>();
  private List<GameCard> hand = new ArrayList<>();
  private List<GameCard> battlefield = new ArrayList<>();
  private List<GameCard> graveyard = new ArrayList<>();
  private int life = 40; // Commander default
  private int mulliganCount = 0;

  public PlayerState() {
  }

  public PlayerState(String playerId, String playerName) {
    this.playerId = playerId;
    this.playerName = playerName;
  }

  public String getPlayerId() {
    return playerId;
  }

  public void setPlayerId(String playerId) {
    this.playerId = playerId;
  }

  public String getPlayerName() {
    return playerName;
  }

  public void setPlayerName(String playerName) {
    this.playerName = playerName;
  }

  public List<GameCard> getLibrary() {
    return library;
  }

  public void setLibrary(List<GameCard> library) {
    this.library = library;
  }

  public List<GameCard> getHand() {
    return hand;
  }

  public void setHand(List<GameCard> hand) {
    this.hand = hand;
  }

  public List<GameCard> getBattlefield() {
    return battlefield;
  }

  public void setBattlefield(List<GameCard> battlefield) {
    this.battlefield = battlefield;
  }

  public List<GameCard> getGraveyard() {
    return graveyard;
  }

  public void setGraveyard(List<GameCard> graveyard) {
    this.graveyard = graveyard;
  }

  public int getLife() {
    return life;
  }

  public void setLife(int life) {
    this.life = life;
  }

  public int getMulliganCount() {
    return mulliganCount;
  }

  public void setMulliganCount(int mulliganCount) {
    this.mulliganCount = mulliganCount;
  }
}
