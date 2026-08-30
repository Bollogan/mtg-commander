package com.mtg.deckbuilder.game.domain;

/** MVP turn actions. No spell stack in this version (per plan). */
public enum ActionType {
  SHUFFLE,
  DRAW,
  PLAY_CARD,
  TAP,
  MULLIGAN,
  END_TURN,
  /** Life total change; {@code count} carries the (signed) delta. */
  ADJUST_LIFE
}
