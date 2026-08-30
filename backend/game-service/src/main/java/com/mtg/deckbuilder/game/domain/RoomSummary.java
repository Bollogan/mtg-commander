package com.mtg.deckbuilder.game.domain;

/**
 * The lightweight projection listed on the public-rooms browser. Kept out of the room hash so
 * listing open games never has to deserialize whole libraries.
 */
public record RoomSummary(String roomId, String name, String hostName, int players,
                          int maxPlayers, RoomStatus status, long createdAt) {

  public static RoomSummary of(GameState state) {
    return new RoomSummary(state.getRoomId(), state.getName(), state.hostName(),
        state.getPlayers().size(), state.getMaxPlayers(), state.getStatus(), state.getCreatedAt());
  }
}
