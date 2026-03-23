package com.mtg.deckbuilder.deck;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeckRepository extends JpaRepository<DeckEntity, UUID> {
  List<DeckEntity> findByOwnerId(UUID ownerId);
  List<DeckEntity> findByVisibilityOrderByUpdatedAtDesc(DeckVisibility visibility);
  List<DeckEntity> findByVisibilityAndNameContainingIgnoreCaseOrderByUpdatedAtDesc(
      DeckVisibility visibility,
      String name);
}
