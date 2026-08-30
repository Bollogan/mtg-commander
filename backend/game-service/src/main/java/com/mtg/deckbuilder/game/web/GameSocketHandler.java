package com.mtg.deckbuilder.game.web;

import com.corundumstudio.socketio.AuthTokenResult;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIONamespace;
import com.corundumstudio.socketio.SocketIOServer;
import com.mtg.deckbuilder.game.config.SocketIOConfig;
import com.mtg.deckbuilder.game.config.SocketIoJwtVerifier;
import com.mtg.deckbuilder.game.domain.GameAction;
import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.service.GameService;
import java.util.function.BiFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

/**
 * Wires the socket.io events onto the {@link SocketIOServer} and owns its lifecycle. This is the
 * live channel for everything that happens inside a room — lobby included — so every member sees
 * each change at the same moment.
 *
 * <p><b>Auth.</b> The client authenticates with {@code auth: { token }}, which arrives on the
 * socket.io CONNECT packet and is verified by the {@code AuthTokenListener} below (see
 * {@link SocketIOConfig} for why the handshake-level listener cannot do it). The verified user id
 * (JWT {@code uid}) is stashed on the client and is the only identity ever trusted: payloads never
 * get to name their own actor.
 *
 * <p><b>Events in:</b> {@code join}, {@code action}, {@code chat}, {@code ready}, {@code deck},
 * {@code start}, {@code kick}, {@code host}, {@code close}, {@code leave}.
 * <b>Events out:</b> {@code state} (redacted per recipient), {@code error}, {@code roomClosed}.
 */
@Component
public class GameSocketHandler implements SmartLifecycle {

  private static final Logger log = LoggerFactory.getLogger(GameSocketHandler.class);

  private final SocketIOServer server;
  private final GameService gameService;
  private final SocketIoJwtVerifier jwtVerifier;
  private volatile boolean running = false;

  public GameSocketHandler(SocketIOServer server, GameService gameService,
                           SocketIoJwtVerifier jwtVerifier) {
    this.server = server;
    this.gameService = gameService;
    this.jwtVerifier = jwtVerifier;
  }

  @Override
  public void start() {
    // Phase-2 auth: the browser's `auth: { token }` reaches us here, on the CONNECT packet.
    mainNamespace().addAuthTokenListener((authData, client) -> {
      String userId = verifiedUserId(SocketIOConfig.tokenFromAuthData(authData));
      if (userId == null) {
        return new AuthTokenResult(false, new GameError("CONNECT", "Invalid or missing token"));
      }
      client.set("userId", userId);
      return AuthTokenResult.AuthTokenResultSuccess;
    });

    // Covers clients that authenticated with `?token=` at handshake time instead.
    server.addConnectListener(this::userId);

    server.addEventListener("join", RoomPayload.class, (client, payload, ack) ->
        onRoomEvent(client, payload, "JOIN", (userId, roomId) -> {
          GameState state = gameService.getState(roomId);
          if (!state.isMember(userId)) {
            // The REST join seats you; the socket only subscribes. Landing here means the
            // client skipped that step (or was kicked between the two calls).
            throw new IllegalStateException("Not in this room");
          }
          client.joinRoom(roomId);
          return gameService.setConnected(roomId, userId, true);
        }));

    server.addEventListener("action", ActionPayload.class, (client, payload, ack) -> {
      String userId = userId(client);
      if (userId == null || payload == null || payload.roomId() == null) {
        client.sendEvent("error", new GameError("UNKNOWN", "Not authenticated"));
        return;
      }
      GameAction action = payload.action();
      String type = action == null || action.type() == null ? "UNKNOWN" : action.type().name();
      try {
        broadcast(payload.roomId(), applyForUser(userId, payload.roomId(), action));
      } catch (RuntimeException e) {
        log.warn("Action {} rejected in room {}: {}", type, payload.roomId(), e.getMessage());
        client.sendEvent("error", new GameError(type, e.getMessage()));
      }
    });

    server.addEventListener("chat", ChatPayload.class, (client, payload, ack) ->
        onRoomEvent(client, payload, "CHAT", (userId, roomId) ->
            gameService.chat(roomId, userId, null, payload.text())));

    server.addEventListener("ready", ReadyPayload.class, (client, payload, ack) ->
        onRoomEvent(client, payload, "READY", (userId, roomId) ->
            gameService.setReady(roomId, userId, payload.ready())));

    server.addEventListener("deck", DeckPayload.class, (client, payload, ack) ->
        onRoomEvent(client, payload, "DECK", (userId, roomId) ->
            gameService.chooseDeck(roomId, userId, payload.deckId(), payload.deckName())));

    server.addEventListener("start", RoomPayload.class, (client, payload, ack) ->
        onRoomEvent(client, payload, "START", gameService::startGame));

    server.addEventListener("kick", TargetPayload.class, (client, payload, ack) ->
        onRoomEvent(client, payload, "KICK", (userId, roomId) -> {
          GameState state = gameService.kick(roomId, userId, payload.targetId());
          evict(roomId, payload.targetId(), "You were removed from the room");
          return state;
        }));

    server.addEventListener("host", TargetPayload.class, (client, payload, ack) ->
        onRoomEvent(client, payload, "HOST", (userId, roomId) ->
            gameService.transferHost(roomId, userId, payload.targetId())));

    server.addEventListener("close", RoomPayload.class, (client, payload, ack) ->
        onRoomEvent(client, payload, "CLOSE", (userId, roomId) -> {
          gameService.closeRoom(roomId, userId);
          server.getRoomOperations(roomId).sendEvent("roomClosed",
              new GameError("CLOSE", "The host closed the room"));
          return null;
        }));

    server.addEventListener("leave", RoomPayload.class, (client, payload, ack) ->
        onRoomEvent(client, payload, "LEAVE", (userId, roomId) -> {
          GameState state = gameService.leave(roomId, userId);
          client.leaveRoom(roomId);
          return state;
        }));

    // Closing the tab is not leaving the game: the seat is kept, just flagged as away, so the
    // table can be resumed after a refresh or a flaky connection.
    server.addDisconnectListener(client -> {
      String userId = client.get("userId");
      if (userId == null) {
        return;
      }
      for (String roomId : client.getAllRooms()) {
        try {
          GameState state = gameService.setConnected(roomId, userId, false);
          if (state != null) {
            broadcast(roomId, state);
          }
        } catch (RuntimeException e) {
          log.debug("Presence update failed for {} in {}: {}", userId, roomId, e.getMessage());
        }
      }
    });

    server.start();
    running = true;
    log.info("socket.io game server started");
  }

  /**
   * Shared shape for every room event: resolve the caller, run {@code operation}, broadcast the
   * resulting state, and turn any rejection into an {@code error} aimed at just the caller.
   */
  private void onRoomEvent(SocketIOClient client, RoomScoped payload, String label,
                           BiFunction<String, String, GameState> operation) {
    String userId = userId(client);
    if (userId == null || payload == null || payload.roomId() == null) {
      client.sendEvent("error", new GameError(label, "Not authenticated"));
      return;
    }
    try {
      GameState state = operation.apply(userId, payload.roomId());
      if (state != null) {
        broadcast(payload.roomId(), state);
      }
    } catch (RuntimeException e) {
      log.warn("{} rejected in room {}: {}", label, payload.roomId(), e.getMessage());
      client.sendEvent("error", new GameError(label, e.getMessage()));
    }
  }

  /**
   * Sends the room its new state, redacted separately for each recipient — hands and libraries
   * are not the same secret to every viewer, so there is no one payload that fits the whole room.
   */
  private void broadcast(String roomId, GameState state) {
    for (SocketIOClient member : server.getRoomOperations(roomId).getClients()) {
      member.sendEvent("state", state.redactedFor(member.get("userId")));
    }
  }

  /** Boots every socket belonging to {@code targetId} out of the room, with a reason. */
  private void evict(String roomId, String targetId, String reason) {
    for (SocketIOClient member : server.getRoomOperations(roomId).getClients()) {
      if (targetId.equals(member.get("userId"))) {
        member.sendEvent("roomClosed", new GameError("KICK", reason));
        member.leaveRoom(roomId);
      }
    }
  }

  /** netty-socketio names the main namespace {@code ""}; be tolerant of {@code "/"} too. */
  private SocketIONamespace mainNamespace() {
    SocketIONamespace ns = server.getNamespace("");
    return ns != null ? ns : server.getNamespace("/");
  }

  /**
   * The authenticated user id for this client: the one cached by the auth-token listener, or —
   * for a {@code ?token=} handshake — resolved from the handshake data and then cached.
   */
  private String userId(SocketIOClient client) {
    String cached = client.get("userId");
    if (cached != null) {
      return cached;
    }
    String userId = verifiedUserId(SocketIOConfig.extractToken(client.getHandshakeData()));
    if (userId != null) {
      client.set("userId", userId);
    }
    return userId;
  }

  private String verifiedUserId(String token) {
    return jwtVerifier.verify(token).map(claims -> claims.get("uid", String.class)).orElse(null);
  }

  /**
   * Applies an action on behalf of the verified user (playerId is forced to {@code userId},
   * ignoring any value in the payload). Rejects users that are not players in the room.
   * Package-visible so it can be unit-tested without starting Netty.
   */
  GameState applyForUser(String userId, String roomId, GameAction action) {
    GameState state = gameService.getState(roomId); // throws if room is unknown
    if (state.player(userId).isEmpty()) {
      throw new IllegalStateException("Not a player in this room");
    }
    GameAction trusted = new GameAction(
        action == null ? null : action.type(),
        userId,
        action == null ? null : action.cardInstanceId(),
        action == null ? null : action.count());
    return gameService.applyAction(roomId, trusted);
  }

  @Override
  public void stop() {
    if (running) {
      server.stop();
      running = false;
      log.info("socket.io game server stopped");
    }
  }

  @Override
  public boolean isRunning() {
    return running;
  }

  /** Every inbound payload names the room it is about. */
  public interface RoomScoped {
    String roomId();
  }

  public record RoomPayload(String roomId) implements RoomScoped {
  }

  public record ActionPayload(String roomId, GameAction action) implements RoomScoped {
  }

  public record ChatPayload(String roomId, String text) implements RoomScoped {
  }

  public record ReadyPayload(String roomId, boolean ready) implements RoomScoped {
  }

  public record DeckPayload(String roomId, String deckId, String deckName) implements RoomScoped {
  }

  public record TargetPayload(String roomId, String targetId) implements RoomScoped {
  }

  public record GameError(String action, String message) {
  }
}
