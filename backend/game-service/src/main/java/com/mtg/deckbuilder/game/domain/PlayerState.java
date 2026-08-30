package com.mtg.deckbuilder.game.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.List;

/** Per-player zones, lobby flags and counters. The library is the single source of card order. */
@JsonIgnoreProperties(ignoreUnknown = true)
public class PlayerState {

  private String playerId;
  private String playerName;
  private List<GameCard> library = new ArrayList<>();
  private List<GameCard> hand = new ArrayList<>();
  private List<GameCard> battlefield = new ArrayList<>();
  private List<GameCard> graveyard = new ArrayList<>();
  private int life = 40; // Commander default
  private int mulliganCount = 0;

  // ── Lobby ──────────────────────────────────────────────────────────────────
  /** The deck this player brings to the table. Resolved into a library when the host starts. */
  private String deckId;
  private String deckName;
  /** Ready check in the lobby. The host can only start once every seat is ready. */
  private boolean ready = false;
  /** Live socket presence, so the lobby can grey out players who dropped. */
  private boolean connected = false;

  /**
   * Zone sizes for zones the viewer is not allowed to see the contents of. Set by
   * {@link GameState#redactedFor(String)} on the way out; meaningless on the persisted copy,
   * which always holds the real lists.
   */
  private int librarySize;
  private int handSize;

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

  public String getDeckId() {
    return deckId;
  }

  public void setDeckId(String deckId) {
    this.deckId = deckId;
  }

  public String getDeckName() {
    return deckName;
  }

  public void setDeckName(String deckName) {
    this.deckName = deckName;
  }

  public boolean isReady() {
    return ready;
  }

  public void setReady(boolean ready) {
    this.ready = ready;
  }

  public boolean isConnected() {
    return connected;
  }

  public void setConnected(boolean connected) {
    this.connected = connected;
  }

  public int getLibrarySize() {
    return librarySize;
  }

  public void setLibrarySize(int librarySize) {
    this.librarySize = librarySize;
  }

  public int getHandSize() {
    return handSize;
  }

  public void setHandSize(int handSize) {
    this.handSize = handSize;
  }
}
