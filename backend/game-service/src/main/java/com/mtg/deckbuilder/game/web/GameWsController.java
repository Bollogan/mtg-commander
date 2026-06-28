package com.mtg.deckbuilder.game.web;

import com.mtg.deckbuilder.game.domain.GameAction;
import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.service.GameService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

/**
 * Receives client actions on {@code /app/game/{roomId}/action} and broadcasts the resulting
 * state to all subscribers of {@code /topic/game/{roomId}}.
 */
@Controller
public class GameWsController {

  private static final Logger log = LoggerFactory.getLogger(GameWsController.class);

  private final GameService gameService;
  private final SimpMessagingTemplate messaging;

  public GameWsController(GameService gameService, SimpMessagingTemplate messaging) {
    this.gameService = gameService;
    this.messaging = messaging;
  }

  @MessageMapping("/game/{roomId}/action")
  public void handleAction(@DestinationVariable String roomId, @Payload GameAction action) {
    String topic = "/topic/game/" + roomId;
    try {
      GameState state = gameService.applyAction(roomId, action);
      messaging.convertAndSend(topic, state);
    } catch (RuntimeException e) {
      log.warn("Action {} rejected in room {}: {}", action.type(), roomId, e.getMessage());
      messaging.convertAndSend(topic + "/errors",
          new GameError(action.type() == null ? "UNKNOWN" : action.type().name(), e.getMessage()));
    }
  }

  public record GameError(String action, String message) {
  }
}
