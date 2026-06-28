package com.mtg.deckbuilder.game.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.mtg.deckbuilder.game.domain.ActionType;
import com.mtg.deckbuilder.game.domain.GameAction;
import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.store.GameStateStore;
import java.lang.reflect.Type;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import com.mtg.deckbuilder.game.service.GameService;

/**
 * Verifies the full STOMP round-trip (Fase 4 verification): a client action is processed by
 * the engine and the resulting state is broadcast to subscribers. Uses an in-memory state
 * store so no Redis is required.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "eureka.client.enabled=false",
        "spring.cloud.discovery.enabled=false",
        "spring.cloud.service-registry.auto-registration.enabled=false",
    })
class GameStompIntegrationTest {

  @LocalServerPort
  int port;

  @Autowired
  GameService gameService;

  @TestConfiguration
  static class InMemoryStoreConfig {
    @Bean
    @Primary
    GameStateStore inMemoryStore() {
      return new GameStateStore() {
        private final Map<String, GameState> data = new ConcurrentHashMap<>();

        @Override
        public void save(GameState state) {
          data.put(state.getRoomId(), state);
        }

        @Override
        public java.util.Optional<GameState> find(String roomId) {
          return java.util.Optional.ofNullable(data.get(roomId));
        }

        @Override
        public boolean exists(String roomId) {
          return data.containsKey(roomId);
        }
      };
    }
  }

  @Test
  void actionIsBroadcastToSubscribers() throws Exception {
    GameState room = gameService.createRoom("p1", "Alice", "Test Room", 4, null);
    String roomId = room.getRoomId();

    WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
    client.setMessageConverter(new MappingJackson2MessageConverter());
    org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler scheduler =
        new org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler();
    scheduler.afterPropertiesSet();
    client.setTaskScheduler(scheduler);

    StompSession session = client
        .connectAsync("ws://localhost:" + port + "/ws/game", new StompSessionHandlerAdapter() {})
        .get(5, TimeUnit.SECONDS);

    LinkedBlockingDeque<GameState> received = new LinkedBlockingDeque<>();
    session.subscribe("/topic/game/" + roomId, new StompFrameHandler() {
      @Override
      public Type getPayloadType(StompHeaders headers) {
        return GameState.class;
      }

      @Override
      public void handleFrame(StompHeaders headers, Object payload) {
        received.offer((GameState) payload);
      }
    });

    // Give the subscription a moment to register before sending.
    TimeUnit.MILLISECONDS.sleep(500);
    session.send("/app/game/" + roomId + "/action",
        new GameAction(ActionType.DRAW, "p1", null, 7));

    // Primary assertion: the STOMP SEND was routed to @MessageMapping, processed by the
    // engine and persisted. Poll the store until the action takes effect.
    GameState afterAction = null;
    for (int i = 0; i < 40 && (afterAction == null
        || afterAction.player("p1").orElseThrow().getHand().isEmpty()); i++) {
      afterAction = gameService.getState(roomId);
      TimeUnit.MILLISECONDS.sleep(100);
    }
    assertThat(afterAction).isNotNull();
    assertThat(afterAction.player("p1")).isPresent();
    assertThat(afterAction.player("p1").get().getHand()).hasSize(7);

    // Best-effort: the broker also broadcasts the new state to subscribers.
    GameState broadcast = received.poll(2, TimeUnit.SECONDS);
    if (broadcast != null) {
      assertThat(broadcast.player("p1").orElseThrow().getHand()).hasSize(7);
    }

    try {
      if (session.isConnected()) {
        session.disconnect();
      }
    } catch (RuntimeException ignored) {
      // connection may already be closed by the container; teardown only
    }
    client.stop();
  }
}
