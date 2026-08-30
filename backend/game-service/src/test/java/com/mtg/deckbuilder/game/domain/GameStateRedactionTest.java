package com.mtg.deckbuilder.game.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * The broadcast used to hand every client every opponent's library and hand, which is the whole
 * game given away over the wire. These lock the redaction that replaced it.
 */
class GameStateRedactionTest {

  private static GameState twoPlayerTable() {
    GameState state = new GameState("ABC123", "Table", 4);
    state.getPlayers().add(seatWith("me", "Alice", 40, 7));
    state.getPlayers().add(seatWith("you", "Bob", 55, 6));
    return state;
  }

  private static PlayerState seatWith(String id, String name, int libraryCards, int handCards) {
    PlayerState player = new PlayerState(id, name);
    for (int i = 0; i < libraryCards; i++) {
      player.getLibrary().add(new GameCard("s" + i, "Card " + i, "Creature", null));
    }
    for (int i = 0; i < handCards; i++) {
      player.getHand().add(new GameCard("h" + i, "Hidden " + i, "Instant", null));
    }
    player.getBattlefield().add(new GameCard("b1", "Sol Ring", "Artifact", null));
    return player;
  }

  @Test
  void nobodySeesAnyLibraryContents() {
    GameState view = twoPlayerTable().redactedFor("me");

    assertThat(view.getPlayers()).allSatisfy(p -> assertThat(p.getLibrary()).isEmpty());
    assertThat(view.player("me").orElseThrow().getLibrarySize()).isEqualTo(40);
    assertThat(view.player("you").orElseThrow().getLibrarySize()).isEqualTo(55);
  }

  @Test
  void onlyTheViewerSeesTheirOwnHand() {
    GameState view = twoPlayerTable().redactedFor("me");

    assertThat(view.player("me").orElseThrow().getHand()).hasSize(7);
    assertThat(view.player("you").orElseThrow().getHand()).isEmpty();
    // ...but the size still travels, so the table can render face-down cards.
    assertThat(view.player("you").orElseThrow().getHandSize()).isEqualTo(6);
  }

  @Test
  void publicZonesAndLobbyMetadataSurvive() {
    GameState state = twoPlayerTable();
    state.setStatus(RoomStatus.IN_GAME);
    state.setHostId("me");
    state.setPublicRoom(true);
    state.setSpectators(List.of(new Spectator("watcher", "Carol")));
    state.addChat(ChatMessage.from("you", "Bob", "gg"));

    GameState view = state.redactedFor("watcher");

    assertThat(view.getPlayers()).allSatisfy(p -> assertThat(p.getBattlefield()).hasSize(1));
    assertThat(view.getStatus()).isEqualTo(RoomStatus.IN_GAME);
    assertThat(view.getHostId()).isEqualTo("me");
    assertThat(view.isPublicRoom()).isTrue();
    assertThat(view.getSpectators()).hasSize(1);
    assertThat(view.getChat()).hasSize(1);
    // A spectator is nobody's owner, so no hand at all is disclosed.
    assertThat(view.getPlayers()).allSatisfy(p -> assertThat(p.getHand()).isEmpty());
  }

  @Test
  void redactionDoesNotMutateTheStoredState() {
    GameState state = twoPlayerTable();

    state.redactedFor("me");

    assertThat(state.player("you").orElseThrow().getLibrary()).hasSize(55);
    assertThat(state.player("you").orElseThrow().getHand()).hasSize(6);
  }

  @Test
  void chatIsBoundedToTheMostRecentLines() {
    GameState state = twoPlayerTable();
    for (int i = 0; i < GameState.MAX_CHAT + 10; i++) {
      state.addChat(ChatMessage.from("me", "Alice", "line " + i));
    }

    assertThat(state.getChat()).hasSize(GameState.MAX_CHAT);
    assertThat(state.getChat().get(0).text()).isEqualTo("line 10");
  }
}
