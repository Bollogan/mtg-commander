package com.mtg.deckbuilder.game.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Full state of a game room. Redis is the single source of truth. */
@JsonIgnoreProperties(ignoreUnknown = true)
public class GameState {

  private String roomId;
  private String name;
  private int maxPlayers = 4;
  private int turn = 1;
  private String activePlayerId;
  private List<PlayerState> players = new ArrayList<>();

  public GameState() {
  }

  public GameState(String roomId, String name, int maxPlayers) {
    this.roomId = roomId;
    this.name = name;
    this.maxPlayers = maxPlayers;
  }

  public Optional<PlayerState> player(String playerId) {
    return players.stream().filter(p -> p.getPlayerId().equals(playerId)).findFirst();
  }

  @JsonIgnore
  public boolean isFull() {
    return players.size() >= maxPlayers;
  }

  public String getRoomId() {
    return roomId;
  }

  public void setRoomId(String roomId) {
    this.roomId = roomId;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public int getMaxPlayers() {
    return maxPlayers;
  }

  public void setMaxPlayers(int maxPlayers) {
    this.maxPlayers = maxPlayers;
  }

  public int getTurn() {
    return turn;
  }

  public void setTurn(int turn) {
    this.turn = turn;
  }

  public String getActivePlayerId() {
    return activePlayerId;
  }

  public void setActivePlayerId(String activePlayerId) {
    this.activePlayerId = activePlayerId;
  }

  public List<PlayerState> getPlayers() {
    return players;
  }

  public void setPlayers(List<PlayerState> players) {
    this.players = players;
  }
}
