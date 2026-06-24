package com.mtg.deckbuilder.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.mtg.deckbuilder.ai.client.DeckClient;
import com.mtg.deckbuilder.ai.client.DeckView;
import com.mtg.deckbuilder.ai.web.RecommendRequest;
import com.mtg.deckbuilder.ai.web.RecommendResponse;
import java.util.List;
import org.junit.jupiter.api.Test;

class RecommendationServiceTest {

  private final DeckClient deckClient = mock(DeckClient.class);
  // externalEnabled = false → recommend() goes straight to the fallback path.
  private final RecommendationService service =
      new RecommendationService(null, deckClient, null, false);

  private DeckView deckWithSynergy() {
    return new DeckView(
        "deck1", "Flyers",
        List.of(
            new DeckView.Card("c1", "Serra Angel", "Flying, vigilance", null),
            new DeckView.Card("c2", "Birds of Paradise", "Flying", null),
            new DeckView.Card("c3", "Grizzly Bears", "", null)),
        new DeckView.Stats(List.of(new DeckView.KeywordSynergy("flying", 2))));
  }

  @Test
  void fallbackUsesCoOccurrenceWhenExternalDisabled() {
    when(deckClient.getDeck("deck1")).thenReturn(deckWithSynergy());

    RecommendResponse response = service.recommend(new RecommendRequest("deck1", "commander", List.of()));

    assertThat(response.source()).isEqualTo("fallback");
    assertThat(response.suggestions()).extracting(RecommendResponse.Suggestion::name)
        .containsExactly("Serra Angel", "Birds of Paradise");
    assertThat(response.suggestions().get(0).reason()).contains("flying");
  }

  @Test
  void fallbackReturnsEmptyWhenNoSynergies() {
    when(deckClient.getDeck("deck2")).thenReturn(
        new DeckView("deck2", "Random", List.of(), new DeckView.Stats(List.of())));

    RecommendResponse response = service.recommend(new RecommendRequest("deck2", "commander", List.of()));

    assertThat(response.source()).isEqualTo("fallback");
    assertThat(response.suggestions()).isEmpty();
  }

  @Test
  void fallbackIsResilientToDeckServiceFailure() {
    when(deckClient.getDeck("deck3")).thenThrow(new RuntimeException("deck-service down"));

    RecommendResponse response = service.recommend(new RecommendRequest("deck3", "commander", List.of()));

    assertThat(response.source()).isEqualTo("fallback");
    assertThat(response.suggestions()).isEmpty();
  }
}
