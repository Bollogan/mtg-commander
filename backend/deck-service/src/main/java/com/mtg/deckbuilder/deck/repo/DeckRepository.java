package com.mtg.deckbuilder.deck.repo;

import com.mtg.deckbuilder.deck.domain.Deck;
import com.mtg.deckbuilder.deck.domain.DeckVisibility;
import java.util.List;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DeckRepository extends MongoRepository<Deck, String> {

  List<Deck> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);

  List<Deck> findByVisibilityOrderByUpdatedAtDesc(DeckVisibility visibility);

  List<Deck> findByVisibilityAndNameContainingIgnoreCaseOrderByUpdatedAtDesc(
      DeckVisibility visibility, String name);

  long deleteByOwnerId(UUID ownerId);
}
