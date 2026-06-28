package com.mtg.deckbuilder.game.service;

import com.mtg.deckbuilder.game.client.DeckClient;
import com.mtg.deckbuilder.game.client.DeckView;
import com.mtg.deckbuilder.game.domain.GameAction;
import com.mtg.deckbuilder.game.domain.GameCard;
import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.domain.PlayerState;
import com.mtg.deckbuilder.game.engine.GameEngine;
import com.mtg.deckbuilder.game.store.GameStateStore;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class GameService {

  private static final Logger log = LoggerFactory.getLogger(GameService.class);
  private static final int GENERIC_LIBRARY_SIZE = 60;

  private final GameStateStore store;
  private final GameEngine engine;
  private final DeckClient deckClient;

  public GameService(GameStateStore store, GameEngine engine, DeckClient deckClient) {
    this.store = store;
    this.engine = engine;
    this.deckClient = deckClient;
  }

  public GameState createRoom(String creatorId, String creatorName, String name,
                              int maxPlayers, String deckId) {
    String roomId = UUID.randomUUID().toString().substring(0, 8);
    int cappedPlayers = Math.min(Math.max(maxPlayers, 1), 4);
    GameState state = new GameState(roomId, name, cappedPlayers);
    addPlayer(state, creatorId, creatorName, deckId);
    state.setActivePlayerId(creatorId);
    store.save(state);
    log.info("Created room {} ({}) by {}", roomId, name, creatorId);
    return state;
  }

  public GameState joinRoom(String roomId, String playerId, String playerName, String deckId) {
    GameState state = require(roomId);
    if (state.player(playerId).isPresent()) {
      return state; // idempotent re-join
    }
    if (state.isFull()) {
      throw new IllegalStateException("Room is full");
    }
    addPlayer(state, playerId, playerName, deckId);
    store.save(state);
    return state;
  }

  public GameState getState(String roomId) {
    return require(roomId);
  }

  /** Applies an action and persists; returns the new state for broadcasting. */
  public GameState applyAction(String roomId, GameAction action) {
    GameState state = require(roomId);
    engine.apply(state, action);
    store.save(state);
    return state;
  }

  private void addPlayer(GameState state, String playerId, String playerName, String deckId) {
    PlayerState player = new PlayerState(playerId, playerName == null ? "Player" : playerName);
    player.setLibrary(buildLibrary(deckId, playerId));
    state.getPlayers().add(player);
  }

  /** Builds a library from a saved deck (via Feign); falls back to a generic library. */
  private List<GameCard> buildLibrary(String deckId, String playerId) {
    if (deckId != null && !deckId.isBlank()) {
      try {
        DeckView deck = deckClient.getDeck(deckId, playerId);
        if (deck != null && deck.cards() != null && !deck.cards().isEmpty()) {
          List<GameCard> library = new ArrayList<>();
          for (DeckView.Card card : deck.cards()) {
            for (int i = 0; i < Math.max(1, card.qty()); i++) {
              library.add(new GameCard(card.scryfallId(), card.name(),
                  card.typeLine(), card.imageUrl()));
            }
          }
          return library;
        }
      } catch (RuntimeException e) {
        log.warn("Could not load deck {} for player {}: {} — using generic library",
            deckId, playerId, e.getMessage());
      }
    }
    return genericLibrary();
  }

  private List<GameCard> genericLibrary() {
    List<GameCard> library = new ArrayList<>();
    for (int i = 0; i < GENERIC_LIBRARY_SIZE; i++) {
      String type = i < 24 ? "Basic Land — Forest" : "Creature — Bear";
      String name = i < 24 ? "Forest" : "Grizzly Bears " + (i - 23);
      library.add(new GameCard("generic-" + i, name, type, null));
    }
    return library;
  }

  private GameState require(String roomId) {
    return store.find(roomId)
        .orElseThrow(() -> new IllegalArgumentException("Room not found: " + roomId));
  }
}
