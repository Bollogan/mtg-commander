package com.mtg.deckbuilder.deck.synergy;

import static org.assertj.core.api.Assertions.assertThat;

import com.mtg.deckbuilder.deck.domain.DeckCard;
import com.mtg.deckbuilder.deck.domain.DeckStats;
import java.util.List;
import org.junit.jupiter.api.Test;

class SynergyServiceTest {

  private final SynergyService service = new SynergyService(null);

  private DeckCard card(String name, String oracle) {
    DeckCard c = new DeckCard("id-" + name, 1);
    c.setName(name);
    c.setOracleText(oracle);
    return c;
  }

  @Test
  void detectsKeywordSharedByMultipleCards() {
    List<DeckStats.KeywordSynergy> synergies = service.detect(List.of(
        card("Serra Angel", "Flying, vigilance"),
        card("Birds of Paradise", "Flying"),
        card("Shivan Dragon", "Flying. {R}: gets +1/+0.")));

    assertThat(synergies).isNotEmpty();
    assertThat(synergies.get(0).keyword()).isEqualTo("flying");
    assertThat(synergies.get(0).cardCount()).isEqualTo(3);
  }

  @Test
  void ignoresKeywordsAppearingInOnlyOneCard() {
    List<DeckStats.KeywordSynergy> synergies = service.detect(List.of(
        card("Lone Flyer", "Flying"),
        card("Vanilla Bear", "")));

    assertThat(synergies).isEmpty();
  }

  @Test
  void emptyDeckYieldsNoSynergies() {
    assertThat(service.detect(List.of())).isEmpty();
    assertThat(service.detect(null)).isEmpty();
  }
}
