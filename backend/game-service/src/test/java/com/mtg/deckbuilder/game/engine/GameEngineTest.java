package com.mtg.deckbuilder.game.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mtg.deckbuilder.game.domain.ActionType;
import com.mtg.deckbuilder.game.domain.GameAction;
import com.mtg.deckbuilder.game.domain.GameCard;
import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.domain.PlayerState;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class GameEngineTest {

  private static final String PLAYER = "p1";
  private final GameEngine engine = new GameEngine();
  private GameState state;

  @BeforeEach
  void setup() {
    state = new GameState("room1", "Test", 4);
    PlayerState player = new PlayerState(PLAYER, "Alice");
    List<GameCard> library = new ArrayList<>();
    for (int i = 0; i < 60; i++) {
      library.add(new GameCard("card-" + i, "Card " + i, "Creature", null));
    }
    player.setLibrary(library);
    state.getPlayers().add(player);
    state.setActivePlayerId(PLAYER);
  }

  private PlayerState player() {
    return state.player(PLAYER).orElseThrow();
  }

  private void apply(ActionType type, String cardInstanceId, Integer count) {
    engine.apply(state, new GameAction(type, PLAYER, cardInstanceId, count));
  }

  @Test
  void drawMovesCardsFromLibraryToHand() {
    apply(ActionType.DRAW, null, 7);

    assertThat(player().getHand()).hasSize(7);
    assertThat(player().getLibrary()).hasSize(53);
  }

  @Test
  void shuffleKeepsAllCardsButReorders() {
    List<String> before = player().getLibrary().stream().map(GameCard::getName).toList();
    apply(ActionType.SHUFFLE, null, null);
    List<String> after = player().getLibrary().stream().map(GameCard::getName).toList();

    assertThat(after).containsExactlyInAnyOrderElementsOf(before);
    assertThat(player().getLibrary()).hasSize(60);
  }

  @Test
  void playCardMovesFromHandToBattlefield() {
    apply(ActionType.DRAW, null, 1);
    GameCard drawn = player().getHand().get(0);

    apply(ActionType.PLAY_CARD, drawn.getInstanceId(), null);

    assertThat(player().getHand()).isEmpty();
    assertThat(player().getBattlefield()).extracting(GameCard::getInstanceId)
        .containsExactly(drawn.getInstanceId());
  }

  @Test
  void tapTogglesBattlefieldCard() {
    apply(ActionType.DRAW, null, 1);
    GameCard drawn = player().getHand().get(0);
    apply(ActionType.PLAY_CARD, drawn.getInstanceId(), null);

    apply(ActionType.TAP, drawn.getInstanceId(), null);
    assertThat(player().getBattlefield().get(0).isTapped()).isTrue();

    apply(ActionType.TAP, drawn.getInstanceId(), null);
    assertThat(player().getBattlefield().get(0).isTapped()).isFalse();
  }

  @Test
  void londonMulliganRedrawsSevenAndBottomsByMulliganCount() {
    apply(ActionType.DRAW, null, 7);

    apply(ActionType.MULLIGAN, null, null); // first mulligan: bottom 1

    assertThat(player().getMulliganCount()).isEqualTo(1);
    assertThat(player().getHand()).hasSize(6);
    assertThat(player().getLibrary()).hasSize(54);
    // No cards lost
    int totalCards = player().getHand().size() + player().getLibrary().size()
        + player().getBattlefield().size() + player().getGraveyard().size();
    assertThat(totalCards).isEqualTo(60);
  }

  @Test
  void secondMulliganBottomsTwo() {
    apply(ActionType.DRAW, null, 7);
    apply(ActionType.MULLIGAN, null, null);
    apply(ActionType.MULLIGAN, null, null);

    assertThat(player().getMulliganCount()).isEqualTo(2);
    assertThat(player().getHand()).hasSize(5);
  }

  @Test
  void endTurnAdvancesActivePlayerAndTurnCounter() {
    state.getPlayers().add(new PlayerState("p2", "Bob"));

    apply(ActionType.END_TURN, null, null);
    assertThat(state.getActivePlayerId()).isEqualTo("p2");
    assertThat(state.getTurn()).isEqualTo(1);

    engine.apply(state, new GameAction(ActionType.END_TURN, "p2", null, null));
    assertThat(state.getActivePlayerId()).isEqualTo(PLAYER);
    assertThat(state.getTurn()).isEqualTo(2);
  }

  @Test
  void unknownPlayerIsRejected() {
    assertThatThrownBy(() ->
        engine.apply(state, new GameAction(ActionType.DRAW, "ghost", null, 1)))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
