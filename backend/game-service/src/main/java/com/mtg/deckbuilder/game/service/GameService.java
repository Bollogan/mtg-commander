package com.mtg.deckbuilder.game.service;

import com.mtg.deckbuilder.game.client.DeckClient;
import com.mtg.deckbuilder.game.client.DeckView;
import com.mtg.deckbuilder.game.domain.ChatMessage;
import com.mtg.deckbuilder.game.domain.GameAction;
import com.mtg.deckbuilder.game.domain.GameCard;
import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.domain.PlayerState;
import com.mtg.deckbuilder.game.domain.RoomStatus;
import com.mtg.deckbuilder.game.domain.RoomSummary;
import com.mtg.deckbuilder.game.domain.Spectator;
import com.mtg.deckbuilder.game.engine.GameEngine;
import com.mtg.deckbuilder.game.store.GameStateStore;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Room lifecycle and lobby rules. A room is created in {@link RoomStatus#LOBBY}: players arrive
 * through the invite link (or the public browser), pick a deck and ready up; the host starts,
 * which is the point at which decks are resolved into shuffled libraries. No state lives in this
 * service — everything goes through {@link GameStateStore}.
 */
@Service
public class GameService {

  private static final Logger log = LoggerFactory.getLogger(GameService.class);
  private static final int GENERIC_LIBRARY_SIZE = 60;
  private static final int MAX_CHAT_LENGTH = 500;

  /**
   * Invite codes double as room ids, so a link needs no second lookup. The alphabet drops the
   * characters people mistype when reading a code aloud (0/O, 1/I/L).
   */
  private static final String CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  private static final int CODE_LENGTH = 6;
  private static final SecureRandom RANDOM = new SecureRandom();

  private final GameStateStore store;
  private final GameEngine engine;
  private final DeckClient deckClient;

  public GameService(GameStateStore store, GameEngine engine, DeckClient deckClient) {
    this.store = store;
    this.engine = engine;
    this.deckClient = deckClient;
  }

  // ── Room lifecycle ─────────────────────────────────────────────────────────

  public GameState createRoom(String creatorId, String creatorName, String name,
                              int maxPlayers, String deckId, boolean publicRoom) {
    GameState state = new GameState(newRoomCode(), name, Math.min(Math.max(maxPlayers, 1), 4));
    state.setHostId(creatorId);
    state.setPublicRoom(publicRoom);
    state.setActivePlayerId(creatorId);
    seat(state, creatorId, creatorName, deckId);
    state.addChat(ChatMessage.system(displayName(creatorName) + " created the room"));
    store.save(state);
    log.info("Created room {} ({}) by {}", state.getRoomId(), name, creatorId);
    return state;
  }

  /**
   * Seats the caller, or — if the game is already running or the table is full — sits them
   * behind it as a spectator. Re-joining an existing seat is idempotent, which is what makes
   * reconnecting after a dropped socket work.
   */
  public GameState joinRoom(String roomId, String userId, String userName, String deckId) {
    GameState state = require(roomId);
    if (state.player(userId).isPresent() || state.isSpectator(userId)) {
      return state;
    }
    if (state.getStatus() == RoomStatus.FINISHED) {
      throw new IllegalStateException("This room is closed");
    }
    if (state.getStatus() == RoomStatus.LOBBY && !state.isFull()) {
      seat(state, userId, userName, deckId);
      state.addChat(ChatMessage.system(displayName(userName) + " joined"));
    } else {
      state.getSpectators().add(new Spectator(userId, displayName(userName)));
      state.addChat(ChatMessage.system(displayName(userName) + " is watching"));
    }
    store.save(state);
    return state;
  }

  public GameState getState(String roomId) {
    return require(roomId);
  }

  public List<RoomSummary> publicLobbies() {
    return store.publicLobbies();
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────

  /** Picks the deck this player brings. Only meaningful before the host starts the game. */
  public GameState chooseDeck(String roomId, String userId, String deckId, String deckName) {
    GameState state = requireLobby(roomId);
    PlayerState player = requirePlayer(state, userId);
    player.setDeckId(deckId == null || deckId.isBlank() ? null : deckId);
    player.setDeckName(deckName);
    // A different deck is a different table presence — re-confirm before we start.
    player.setReady(false);
    store.save(state);
    return state;
  }

  public GameState setReady(String roomId, String userId, boolean ready) {
    GameState state = requireLobby(roomId);
    requirePlayer(state, userId).setReady(ready);
    store.save(state);
    return state;
  }

  /** Host-only. Resolves every seat's deck into a shuffled library and opens the game. */
  public GameState startGame(String roomId, String hostId) {
    GameState state = requireLobby(roomId);
    requireHost(state, hostId);
    if (state.getPlayers().stream().anyMatch(p -> !p.isReady())) {
      throw new IllegalStateException("Every player must be ready before starting");
    }
    for (PlayerState player : state.getPlayers()) {
      List<GameCard> library = buildLibrary(player.getDeckId(), player.getPlayerId());
      Collections.shuffle(library);
      player.setLibrary(library);
      player.setHand(new ArrayList<>());
      player.setBattlefield(new ArrayList<>());
      player.setGraveyard(new ArrayList<>());
      player.setMulliganCount(0);
    }
    state.setStatus(RoomStatus.IN_GAME);
    state.setTurn(1);
    state.setActivePlayerId(state.getPlayers().get(0).getPlayerId());
    state.addChat(ChatMessage.system("The game has begun — good luck!"));
    store.save(state);
    log.info("Room {} started with {} players", roomId, state.getPlayers().size());
    return state;
  }

  // ── Moderation ─────────────────────────────────────────────────────────────

  /** Host-only. Removes a player's seat (or a spectator) from the room. */
  public GameState kick(String roomId, String hostId, String targetId) {
    GameState state = require(roomId);
    requireHost(state, hostId);
    if (hostId.equals(targetId)) {
      throw new IllegalStateException("The host cannot kick themselves; close the room instead");
    }
    String name = memberName(state, targetId);
    if (name == null) {
      throw new IllegalArgumentException("Not in this room: " + targetId);
    }
    state.getPlayers().removeIf(p -> p.getPlayerId().equals(targetId));
    state.getSpectators().removeIf(s -> s.userId().equals(targetId));
    state.addChat(ChatMessage.system(name + " was removed by the host"));
    store.save(state);
    return state;
  }

  /** Host-only. Hands the room over to another seated player. */
  public GameState transferHost(String roomId, String hostId, String targetId) {
    GameState state = require(roomId);
    requireHost(state, hostId);
    PlayerState target = requirePlayer(state, targetId);
    state.setHostId(targetId);
    state.addChat(ChatMessage.system(target.getPlayerName() + " is now the host"));
    store.save(state);
    return state;
  }

  /** Host-only. Ends the room for everyone and deletes it. */
  public void closeRoom(String roomId, String hostId) {
    GameState state = require(roomId);
    requireHost(state, hostId);
    store.delete(roomId);
    log.info("Room {} closed by host {}", roomId, hostId);
  }

  /**
   * The caller leaves. In the lobby that frees the seat; mid-game the seat is kept (so they can
   * reconnect) and only marked disconnected. The host role passes to whoever is left, and a room
   * with nobody seated is deleted outright.
   *
   * @return the new state, or {@code null} when the room is now gone
   */
  public GameState leave(String roomId, String userId) {
    GameState state = require(roomId);
    if (state.isSpectator(userId)) {
      state.getSpectators().removeIf(s -> s.userId().equals(userId));
      store.save(state);
      return state;
    }
    PlayerState player = state.player(userId).orElse(null);
    if (player == null) {
      return state;
    }
    if (state.getStatus() == RoomStatus.LOBBY) {
      state.getPlayers().removeIf(p -> p.getPlayerId().equals(userId));
    } else {
      player.setConnected(false);
    }
    state.addChat(ChatMessage.system(player.getPlayerName() + " left"));

    if (state.getPlayers().isEmpty()) {
      store.delete(roomId);
      return null;
    }
    if (state.isHost(userId)) {
      PlayerState heir = state.getPlayers().get(0);
      state.setHostId(heir.getPlayerId());
      state.addChat(ChatMessage.system(heir.getPlayerName() + " is now the host"));
    }
    store.save(state);
    return state;
  }

  // ── Chat & presence ────────────────────────────────────────────────────────

  public GameState chat(String roomId, String userId, String fallbackName, String text) {
    GameState state = require(roomId);
    if (!state.isMember(userId)) {
      throw new IllegalStateException("Not in this room");
    }
    String body = text == null ? "" : text.strip();
    if (body.isEmpty()) {
      throw new IllegalArgumentException("Empty message");
    }
    if (body.length() > MAX_CHAT_LENGTH) {
      body = body.substring(0, MAX_CHAT_LENGTH);
    }
    String author = memberName(state, userId);
    state.addChat(ChatMessage.from(userId, author == null ? displayName(fallbackName) : author,
        body));
    store.save(state);
    return state;
  }

  /** Flags a seat as (dis)connected so the lobby can show who actually has the tab open. */
  public GameState setConnected(String roomId, String userId, boolean connected) {
    GameState state = store.find(roomId).orElse(null);
    if (state == null) {
      return null;
    }
    PlayerState player = state.player(userId).orElse(null);
    if (player == null || player.isConnected() == connected) {
      return state;
    }
    player.setConnected(connected);
    store.save(state);
    return state;
  }

  // ── Play ───────────────────────────────────────────────────────────────────

  /** Applies an action and persists; returns the new state for broadcasting. */
  public GameState applyAction(String roomId, GameAction action) {
    GameState state = require(roomId);
    if (state.getStatus() != RoomStatus.IN_GAME) {
      throw new IllegalStateException("The game has not started yet");
    }
    engine.apply(state, action);
    store.save(state);
    return state;
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private void seat(GameState state, String playerId, String playerName, String deckId) {
    PlayerState player = new PlayerState(playerId, displayName(playerName));
    player.setDeckId(deckId == null || deckId.isBlank() ? null : deckId);
    state.getPlayers().add(player);
  }

  /** Display name of a seated player or a spectator; {@code null} if they are in neither list. */
  private static String memberName(GameState state, String userId) {
    return state.player(userId).map(PlayerState::getPlayerName)
        .orElseGet(() -> state.getSpectators().stream()
            .filter(s -> s.userId().equals(userId))
            .findFirst()
            .map(Spectator::userName)
            .orElse(null));
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

  /** A short, unambiguous, unused room code. */
  private String newRoomCode() {
    for (int attempt = 0; attempt < 10; attempt++) {
      StringBuilder code = new StringBuilder(CODE_LENGTH);
      for (int i = 0; i < CODE_LENGTH; i++) {
        code.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
      }
      if (!store.exists(code.toString())) {
        return code.toString();
      }
    }
    throw new IllegalStateException("Could not allocate a free room code");
  }

  private static String displayName(String name) {
    return name == null || name.isBlank() ? "Player" : name;
  }

  private GameState require(String roomId) {
    return store.find(roomId)
        .orElseThrow(() -> new IllegalArgumentException("Room not found: " + roomId));
  }

  private GameState requireLobby(String roomId) {
    GameState state = require(roomId);
    if (state.getStatus() != RoomStatus.LOBBY) {
      throw new IllegalStateException("The game has already started");
    }
    return state;
  }

  private static PlayerState requirePlayer(GameState state, String userId) {
    return state.player(userId)
        .orElseThrow(() -> new IllegalStateException("Not a player in this room"));
  }

  private static void requireHost(GameState state, String userId) {
    if (!state.isHost(userId)) {
      throw new IllegalStateException("Only the host can do that");
    }
  }
}
