package com.mtg.deckbuilder.game.domain;

/** Lifecycle of a room: players gather in the lobby, the host starts, the host (or the last
 * player leaving) closes it. */
public enum RoomStatus {
  LOBBY,
  IN_GAME,
  FINISHED
}
