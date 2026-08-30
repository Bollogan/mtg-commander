package com.mtg.deckbuilder.game.store;

import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.domain.RoomStatus;
import com.mtg.deckbuilder.game.domain.RoomSummary;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Store double for the unit tests, so nothing here needs a Redis. */
public class InMemoryGameStateStore implements GameStateStore {

  private final Map<String, GameState> data = new LinkedHashMap<>();

  @Override
  public void save(GameState state) {
    data.put(state.getRoomId(), state);
  }

  @Override
  public Optional<GameState> find(String roomId) {
    return Optional.ofNullable(data.get(roomId));
  }

  @Override
  public boolean exists(String roomId) {
    return data.containsKey(roomId);
  }

  @Override
  public void delete(String roomId) {
    data.remove(roomId);
  }

  @Override
  public List<RoomSummary> publicLobbies() {
    List<RoomSummary> lobbies = new ArrayList<>();
    for (GameState state : data.values()) {
      if (state.isPublicRoom() && state.getStatus() == RoomStatus.LOBBY) {
        lobbies.add(RoomSummary.of(state));
      }
    }
    lobbies.sort(Comparator.comparingLong(RoomSummary::createdAt).reversed());
    return lobbies;
  }
}
