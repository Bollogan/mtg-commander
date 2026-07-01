package com.mtg.deckbuilder.game.web;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.mtg.deckbuilder.game.config.SocketIOConfig;
import com.mtg.deckbuilder.game.config.SocketIoJwtVerifier;
import com.mtg.deckbuilder.game.domain.GameAction;
import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.service.GameService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

/**
 * Wires the socket.io events onto the {@link SocketIOServer} and owns its lifecycle.
 *
 * <p>Protocol: on connect the authenticated user id (JWT {@code uid}) is stashed on the client;
 * the client emits {@code join {roomId}} to subscribe to a room and {@code action {roomId, action}}
 * to act. The resulting {@link GameState} is broadcast as {@code state} to everyone in the room;
 * failures go back to the caller as {@code error}. The actor is always taken from the verified
 * token (never the payload), and must already be a player in the room.
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
    server.addConnectListener(client -> {
      String token = SocketIOConfig.extractToken(client.getHandshakeData());
      jwtVerifier.verify(token).ifPresent(claims ->
          client.set("userId", claims.get("uid", String.class)));
    });

    server.addEventListener("join", JoinPayload.class, (client, payload, ack) -> {
      if (payload != null && payload.roomId() != null) {
        client.joinRoom(payload.roomId());
      }
    });

    server.addEventListener("action", ActionPayload.class, (client, payload, ack) -> {
      String userId = client.get("userId");
      if (userId == null || payload == null || payload.roomId() == null) {
        client.sendEvent("error", new GameError("UNKNOWN", "Not authenticated"));
        return;
      }
      try {
        GameState state = applyForUser(userId, payload.roomId(), payload.action());
        server.getRoomOperations(payload.roomId()).sendEvent("state", state);
      } catch (RuntimeException e) {
        GameAction action = payload.action();
        String type = action == null || action.type() == null ? "UNKNOWN" : action.type().name();
        log.warn("Action {} rejected in room {}: {}", type, payload.roomId(), e.getMessage());
        client.sendEvent("error", new GameError(type, e.getMessage()));
      }
    });

    server.start();
    running = true;
    log.info("socket.io game server started");
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

  public record JoinPayload(String roomId) {
  }

  public record ActionPayload(String roomId, GameAction action) {
  }

  public record GameError(String action, String message) {
  }
}
