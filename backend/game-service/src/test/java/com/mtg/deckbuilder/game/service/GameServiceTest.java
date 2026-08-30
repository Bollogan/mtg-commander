package com.mtg.deckbuilder.game.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.domain.RoomStatus;
import com.mtg.deckbuilder.game.engine.GameEngine;
import com.mtg.deckbuilder.game.store.InMemoryGameStateStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Lobby rules: seating, the ready gate, moderation and the public browser. */
class GameServiceTest {

  private InMemoryGameStateStore store;
  private GameService service;
  private String roomId;

  @BeforeEach
  void setup() {
    store = new InMemoryGameStateStore();
    service = new GameService(store, new GameEngine(), null);
    roomId = service.createRoom("host", "Alice", "Table", 2, null, true).getRoomId();
  }

  @Test
  void newRoomOpensInTheLobbyWithTheCreatorAsHost() {
    GameState state = service.getState(roomId);

    assertThat(state.getStatus()).isEqualTo(RoomStatus.LOBBY);
    assertThat(state.getHostId()).isEqualTo("host");
    assertThat(state.getPlayers()).hasSize(1);
    assertThat(state.player("host").orElseThrow().isReady()).isFalse();
    // The room code doubles as the invite code, so it must be short and typable.
    assertThat(roomId).hasSize(6).matches("[A-Z2-9]+");
  }

  @Test
  void hostCannotStartUntilEverySeatIsReady() {
    service.joinRoom(roomId, "guest", "Bob", null);
    service.setReady(roomId, "host", true);

    assertThatThrownBy(() -> service.startGame(roomId, "host"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("ready");

    service.setReady(roomId, "guest", true);
    GameState started = service.startGame(roomId, "host");

    assertThat(started.getStatus()).isEqualTo(RoomStatus.IN_GAME);
    // Libraries are only built at start — that is what lets players swap decks in the lobby.
    assertThat(started.player("guest").orElseThrow().getLibrary()).hasSize(60);
  }

  @Test
  void onlyTheHostMayStartKickOrClose() {
    service.joinRoom(roomId, "guest", "Bob", null);

    assertThatThrownBy(() -> service.startGame(roomId, "guest"))
        .hasMessageContaining("host");
    assertThatThrownBy(() -> service.kick(roomId, "guest", "host"))
        .hasMessageContaining("host");
    assertThatThrownBy(() -> service.closeRoom(roomId, "guest"))
        .hasMessageContaining("host");
  }

  @Test
  void changingDeckClearsTheReadyFlag() {
    service.setReady(roomId, "host", true);

    GameState state = service.chooseDeck(roomId, "host", "deck-1", "Atraxa");

    assertThat(state.player("host").orElseThrow().isReady()).isFalse();
    assertThat(state.player("host").orElseThrow().getDeckName()).isEqualTo("Atraxa");
  }

  @Test
  void latecomersAndOverflowBecomeSpectators() {
    service.joinRoom(roomId, "guest", "Bob", null); // fills the 2-seat table
    GameState state = service.joinRoom(roomId, "third", "Carol", null);

    assertThat(state.getPlayers()).hasSize(2);
    assertThat(state.isSpectator("third")).isTrue();
    // Spectators may talk, but the action path still refuses them (see GameSocketHandlerTest).
    assertThat(state.isMember("third")).isTrue();
  }

  @Test
  void kickRemovesTheTargetAndLeavesASystemLine() {
    service.joinRoom(roomId, "guest", "Bob", null);

    GameState state = service.kick(roomId, "host", "guest");

    assertThat(state.player("guest")).isEmpty();
    assertThat(state.getChat()).last()
        .satisfies(m -> assertThat(m.text()).contains("Bob").contains("removed"));
  }

  @Test
  void hostLeavingHandsTheRoomToTheNextPlayer() {
    service.joinRoom(roomId, "guest", "Bob", null);

    GameState state = service.leave(roomId, "host");

    assertThat(state.getHostId()).isEqualTo("guest");
  }

  @Test
  void theLastPlayerLeavingDeletesTheRoom() {
    assertThat(service.leave(roomId, "host")).isNull();
    assertThat(store.exists(roomId)).isFalse();
  }

  @Test
  void midGameLeavingKeepsTheSeatSoThePlayerCanReconnect() {
    service.setReady(roomId, "host", true);
    service.startGame(roomId, "host");

    GameState state = service.leave(roomId, "host");

    assertThat(state.player("host")).isPresent();
    assertThat(state.player("host").orElseThrow().isConnected()).isFalse();
  }

  @Test
  void onlyOpenPublicRoomsAreListed() {
    service.createRoom("other", "Dave", "Private table", 4, null, false);

    assertThat(service.publicLobbies()).extracting("roomId").containsExactly(roomId);

    service.setReady(roomId, "host", true);
    service.startGame(roomId, "host");

    // Once it starts it is no longer an open lobby, so it drops out of the browser.
    assertThat(service.publicLobbies()).isEmpty();
  }

  @Test
  void chatIsRejectedForNonMembersAndTrimmed() {
    assertThatThrownBy(() -> service.chat(roomId, "stranger", "Eve", "hi"))
        .isInstanceOf(IllegalStateException.class);

    GameState state = service.chat(roomId, "host", null, "  gg  ");

    assertThat(state.getChat()).last().satisfies(m -> {
      assertThat(m.text()).isEqualTo("gg");
      assertThat(m.authorName()).isEqualTo("Alice");
    });
  }
}
