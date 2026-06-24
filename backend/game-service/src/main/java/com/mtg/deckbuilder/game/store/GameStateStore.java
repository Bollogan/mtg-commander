package com.mtg.deckbuilder.game.store;

import com.mtg.deckbuilder.game.domain.GameState;
import java.util.Optional;

/** Persistence boundary for game state. Redis is the production implementation. */
public interface GameStateStore {

  void save(GameState state);

  Optional<GameState> find(String roomId);

  boolean exists(String roomId);
}
