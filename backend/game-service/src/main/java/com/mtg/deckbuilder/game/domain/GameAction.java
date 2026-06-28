package com.mtg.deckbuilder.game.domain;

/**
 * An action sent by a client over STOMP. {@code playerId} is the actor;
 * {@code cardInstanceId} targets a specific card (PLAY_CARD, TAP); {@code count} is the
 * number of cards for DRAW (defaults to 1 when null).
 */
public record GameAction(
    ActionType type,
    String playerId,
    String cardInstanceId,
    Integer count) {

  public int drawCount() {
    return count == null || count < 1 ? 1 : count;
  }
}
