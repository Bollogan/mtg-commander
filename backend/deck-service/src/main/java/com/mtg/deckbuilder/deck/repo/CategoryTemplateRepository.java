package com.mtg.deckbuilder.deck.repo;

import com.mtg.deckbuilder.deck.domain.CategoryTemplate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CategoryTemplateRepository extends MongoRepository<CategoryTemplate, String> {

  List<CategoryTemplate> findByOwnerIdOrGlobalTrueOrderByNameAsc(UUID ownerId);

  List<CategoryTemplate> findByGlobalTrueOrderByNameAsc();
}
