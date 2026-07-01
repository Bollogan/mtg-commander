package com.mtg.deckbuilder.game.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mtg.deckbuilder.game.domain.ActionType;
import com.mtg.deckbuilder.game.domain.GameAction;
import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.engine.GameEngine;
import com.mtg.deckbuilder.game.service.GameService;
import com.mtg.deckbuilder.game.store.GameStateStore;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Unit-tests the socket.io action handler logic without starting Netty. */
class GameSocketHandlerTest {

  /** In-memory store so no Redis is needed. */
  private static class InMemoryStore implements GameStateStore {
    private final Map<String, GameState> data = new HashMap<>();

    @Override public void save(GameState state) {
      data.put(state.getRoomId(), state);
    }

    @Override public Optional<GameState> find(String roomId) {
      return Optional.ofNullable(data.get(roomId));
    }

    @Override public boolean exists(String roomId) {
      return data.containsKey(roomId);
    }
  }

  private GameService gameService;
  private GameSocketHandler handler;
  private String roomId;

  @BeforeEach
  void setup() {
    gameService = new GameService(new InMemoryStore(), new GameEngine(), null);
    handler = new GameSocketHandler(null, gameService, null);
    // Creator "u1" gets a generic 60-card library (deckId null → no Feign call).
    roomId = gameService.createRoom("u1", "Alice", "Game", 4, null).getRoomId();
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
}
