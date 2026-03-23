package com.mtg.deckbuilder.deck;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeckCardRepository extends JpaRepository<DeckCardEntity, UUID> {
  List<DeckCardEntity> findByDeckId(UUID deckId);
}
