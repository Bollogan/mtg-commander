package com.mtg.deckbuilder.game.engine;

import com.mtg.deckbuilder.game.domain.GameAction;
import com.mtg.deckbuilder.game.domain.GameCard;
import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.domain.PlayerState;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Applies a {@link GameAction} to a {@link GameState}. Pure and deterministic except for
 * shuffles (which use the injected randomness of Collections.shuffle). No spell stack —
 * this is the MVP turn engine described in the plan (Fase 4 task 3).
 */
@Component
public class GameEngine {

  private static final int OPENING_HAND = 7;

  /** Mutates and returns the state after applying the action. */
  public GameState apply(GameState state, GameAction action) {
    if (action == null || action.type() == null) {
      throw new IllegalArgumentException("Action and type are required");
    }
    PlayerState player = state.player(action.playerId())
        .orElseThrow(() -> new IllegalArgumentException(
            "Player not in room: " + action.playerId()));

    switch (action.type()) {
      case SHUFFLE -> shuffle(player);
      case DRAW -> draw(player, action.drawCount());
      case PLAY_CARD -> playCard(player, action.cardInstanceId());
      case TAP -> toggleTap(player, action.cardInstanceId());
      case MULLIGAN -> londonMulligan(player);
      case END_TURN -> endTurn(state);
      case ADJUST_LIFE -> adjustLife(player, action.count());
      default -> throw new IllegalArgumentException("Unsupported action: " + action.type());
    }
    return state;
  }

  private void shuffle(PlayerState player) {
    Collections.shuffle(player.getLibrary());
  }

  private void draw(PlayerState player, int count) {
    for (int i = 0; i < count && !player.getLibrary().isEmpty(); i++) {
      GameCard card = player.getLibrary().remove(0);
      player.getHand().add(card);
    }
  }

  private void playCard(PlayerState player, String instanceId) {
    GameCard card = removeFrom(player.getHand(), instanceId);
    if (card == null) {
      throw new IllegalArgumentException("Card not in hand: " + instanceId);
    }
    card.setTapped(false);
    player.getBattlefield().add(card);
  }

  private void toggleTap(PlayerState player, String instanceId) {
    GameCard card = player.getBattlefield().stream()
        .filter(c -> c.getInstanceId().equals(instanceId))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException(
            "Card not on battlefield: " + instanceId));
    card.setTapped(!card.isTapped());
  }

  /**
   * London Mulligan: shuffle the whole hand into the library, draw a fresh 7, then put
   * {@code mulliganCount} cards on the bottom (auto-bottoming the last drawn cards for MVP).
   */
  private void londonMulligan(PlayerState player) {
    player.getLibrary().addAll(player.getHand());
    player.getHand().clear();
    Collections.shuffle(player.getLibrary());

    int newCount = player.getMulliganCount() + 1;
    player.setMulliganCount(newCount);

    draw(player, OPENING_HAND);

    // Bottom `newCount` cards (London): move from hand back to the bottom of the library.
    int toBottom = Math.min(newCount, player.getHand().size());
    for (int i = 0; i < toBottom; i++) {
      GameCard card = player.getHand().remove(player.getHand().size() - 1);
      player.getLibrary().add(card);
    }
  }

  /** Applies a signed life delta. Commander games swing by 20 at a time; no bounds here. */
  private void adjustLife(PlayerState player, Integer delta) {
    if (delta == null || delta == 0) {
      throw new IllegalArgumentException("A life change needs a non-zero delta");
    }
    player.setLife(player.getLife() + delta);
  }

  private void endTurn(GameState state) {
    List<PlayerState> players = state.getPlayers();
    if (players.isEmpty()) {
      return;
    }
    int currentIdx = 0;
    for (int i = 0; i < players.size(); i++) {
      if (players.get(i).getPlayerId().equals(state.getActivePlayerId())) {
        currentIdx = i;
        break;
      }
    }
    int nextIdx = (currentIdx + 1) % players.size();
    state.setActivePlayerId(players.get(nextIdx).getPlayerId());
    if (nextIdx == 0) {
      state.setTurn(state.getTurn() + 1);
    }
  }

  private GameCard removeFrom(List<GameCard> zone, String instanceId) {
    for (int i = 0; i < zone.size(); i++) {
      if (zone.get(i).getInstanceId().equals(instanceId)) {
        return zone.remove(i);
      }
    }
    return null;
  }
}
