package com.mtg.deckbuilder.deck.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.mtg.deckbuilder.deck.domain.Deck;
import com.mtg.deckbuilder.deck.domain.DeckCategory;
import com.mtg.deckbuilder.deck.domain.DeckVisibility;
import com.mtg.deckbuilder.deck.repo.DeckRepository;
import com.mtg.deckbuilder.deck.client.UserClient;
import com.mtg.deckbuilder.deck.scryfall.ScryfallCard;
import com.mtg.deckbuilder.deck.scryfall.ScryfallClient;
import com.mtg.deckbuilder.deck.stats.DeckStatsCalculator;
import com.mtg.deckbuilder.deck.synergy.SynergyService;
import com.mtg.deckbuilder.deck.web.dto.DeckCategoryDto;
import com.mtg.deckbuilder.deck.web.dto.DeckRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DeckServiceTest {

  private final DeckRepository repository = mock(DeckRepository.class);
  private final ScryfallClient scryfall = mock(ScryfallClient.class);
  private final DeckStatsCalculator statsCalculator = mock(DeckStatsCalculator.class);
  private final SynergyService synergyService = mock(SynergyService.class);
  private final UserClient userClient = mock(UserClient.class);
  @SuppressWarnings("unchecked")
  private final org.springframework.data.redis.core.StringRedisTemplate redis =
      mock(org.springframework.data.redis.core.StringRedisTemplate.class);

  private final DeckService service = new DeckService(
      repository, scryfall, statsCalculator, synergyService, userClient, redis);

  @Test
  void createDeckPersistsCategories() {
    UUID ownerId = UUID.randomUUID();
    DeckRequest request = new DeckRequest(
        "Test Deck",
        "commander",
        DeckVisibility.PRIVATE,
        null,
        "Atraxa",
        List.of(),
        List.of(new DeckCategoryDto("Ramp", "#d8a24a", "⚙", 0)));

    when(scryfall.getCards(any())).thenReturn(Map.of());
    when(statsCalculator.calculate(any())).thenReturn(new com.mtg.deckbuilder.deck.domain.DeckStats());
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    var result = service.create(ownerId, "Test User", request);

    assertThat(result.categories()).hasSize(1);
    assertThat(result.categories().get(0).name()).isEqualTo("Ramp");
  }

  @Test
  void updateDeckReplacesCategories() {
    UUID ownerId = UUID.randomUUID();
    String deckId = "deck123";
    Deck existing = new Deck();
    existing.setId(deckId);
    existing.setOwnerId(ownerId);
    existing.setName("Old");
    existing.setFormat("commander");
    existing.setCategories(List.of(new DeckCategory("Old Cat", null, null, 0)));

    when(repository.findById(deckId)).thenReturn(java.util.Optional.of(existing));
    when(scryfall.getCards(any())).thenReturn(Map.of());
    when(statsCalculator.calculate(any())).thenReturn(new com.mtg.deckbuilder.deck.domain.DeckStats());
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    DeckRequest request = new DeckRequest(
        "Updated",
        "commander",
        DeckVisibility.PRIVATE,
        null,
        null,
        List.of(),
        List.of(new DeckCategoryDto("New Cat", "#4a90d8", "●", 0)));

    var result = service.update(deckId, ownerId, request);

    assertThat(result.categories()).hasSize(1);
    assertThat(result.categories().get(0).name()).isEqualTo("New Cat");
  }
}
