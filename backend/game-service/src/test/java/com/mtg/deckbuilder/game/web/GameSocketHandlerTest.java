package com.mtg.deckbuilder.game.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mtg.deckbuilder.game.domain.ActionType;
import com.mtg.deckbuilder.game.domain.GameAction;
import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.engine.GameEngine;
import com.mtg.deckbuilder.game.service.GameService;
import com.mtg.deckbuilder.game.store.InMemoryGameStateStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Unit-tests the socket.io action handler logic without starting Netty. */
class GameSocketHandlerTest {

  private GameService gameService;
  private GameSocketHandler handler;
  private String roomId;

  @BeforeEach
  void setup() {
    gameService = new GameService(new InMemoryGameStateStore(), new GameEngine(), null);
    handler = new GameSocketHandler(null, gameService, null);
    // Creator "u1" plays deckless, so start() falls back to the generic 60-card library and no
    // Feign call is made.
    roomId = gameService.createRoom("u1", "Alice", "Game", 4, null, false).getRoomId();
    gameService.setReady(roomId, "u1", true);
    gameService.startGame(roomId, "u1");
  }

  @Test
  void appliesActionUsingAuthenticatedUserIgnoringPayloadPlayerId() {
    // playerId in the payload is spoofed to "attacker" but must be ignored in favour of "u1".
    GameState state = handler.applyForUser("u1", roomId,
        new GameAction(ActionType.DRAW, "attacker", null, 1));

    assertThat(state.player("u1").orElseThrow().getHand()).hasSize(1);
  }

  @Test
  void rejectsUserThatIsNotInTheRoom() {
    assertThatThrownBy(() -> handler.applyForUser("ghost", roomId,
        new GameAction(ActionType.DRAW, "ghost", null, 1)))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void rejectsActionForUnknownRoom() {
    assertThatThrownBy(() -> handler.applyForUser("u1", "no-such-room",
        new GameAction(ActionType.DRAW, "u1", null, 1)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejectsActionWhileTheRoomIsStillInTheLobby() {
    String lobby = gameService.createRoom("u2", "Bob", "Not started", 4, null, false).getRoomId();

    assertThatThrownBy(() -> handler.applyForUser("u2", lobby,
        new GameAction(ActionType.DRAW, "u2", null, 1)))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("not started");
  }
}
