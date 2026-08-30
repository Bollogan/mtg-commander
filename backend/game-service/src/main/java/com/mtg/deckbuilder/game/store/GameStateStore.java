package com.mtg.deckbuilder.game.store;

import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.domain.RoomSummary;
import java.util.List;
import java.util.Optional;

/** Persistence boundary for game state. Redis is the production implementation. */
public interface GameStateStore {

  void save(GameState state);

  Optional<GameState> find(String roomId);

  boolean exists(String roomId);

  /** Removes the room and its entry in the public index. */
  void delete(String roomId);

  /** Open, public lobbies, newest first — the listing behind the "join a game" browser. */
  List<RoomSummary> publicLobbies();
}
