package com.mtg.deckbuilder.deck.stats;

import static org.assertj.core.api.Assertions.assertThat;

import com.mtg.deckbuilder.deck.domain.DeckCard;
import com.mtg.deckbuilder.deck.domain.DeckStats;
import java.util.List;
import org.junit.jupiter.api.Test;

class DeckStatsCalculatorTest {

  private final DeckStatsCalculator calculator = new DeckStatsCalculator();

  private DeckCard card(String name, int qty, double cmc, String typeLine, List<String> colors) {
    DeckCard c = new DeckCard("id-" + name, qty);
    c.setName(name);
    c.setCmc(cmc);
    c.setTypeLine(typeLine);
    c.setColors(colors);
    return c;
  }

  @Test
  void totalsCountQuantities() {
    DeckStats stats = calculator.calculate(List.of(
        card("Forest", 24, 0, "Basic Land — Forest", List.of()),
        card("Llanowar Elves", 4, 1, "Creature — Elf Druid", List.of("G")),
        card("Craterhoof Behemoth", 1, 8, "Creature — Beast", List.of("G"))));

    assertThat(stats.getTotalCards()).isEqualTo(29);
  }

  @Test
  void landsAreExcludedFromManaCurveButCountedInTypes() {
    DeckStats stats = calculator.calculate(List.of(
        card("Island", 10, 0, "Basic Land — Island", List.of()),
        card("Opt", 3, 1, "Instant", List.of("U")),
        card("Counterspell", 2, 2, "Instant", List.of("U"))));

    // Lands not in curve
    assertThat(stats.getManaCurve().get("0")).isEqualTo(0);
    assertThat(stats.getManaCurve().get("1")).isEqualTo(3);
    assertThat(stats.getManaCurve().get("2")).isEqualTo(2);
    // Lands counted in type distribution
    assertThat(stats.getTypeDistribution().get("Land")).isEqualTo(10);
    assertThat(stats.getTypeDistribution().get("Instant")).isEqualTo(5);
  }

  @Test
  void highCmcCardsBucketIntoSevenPlus() {
    DeckStats stats = calculator.calculate(List.of(
        card("Emrakul", 1, 15, "Legendary Creature — Eldrazi", List.of()),
        card("Ulamog", 1, 10, "Legendary Creature — Eldrazi", List.of()),
        card("Bear", 1, 2, "Creature — Bear", List.of("G"))));

    assertThat(stats.getManaCurve().get("7+")).isEqualTo(2);
    assertThat(stats.getManaCurve().get("2")).isEqualTo(1);
  }

  @Test
  void multicolorCardCountsInEachColorAndColorlessGoesToC() {
    DeckStats stats = calculator.calculate(List.of(
        card("Niv-Mizzet", 1, 6, "Legendary Creature — Dragon", List.of("U", "R")),
        card("Sol Ring", 1, 1, "Artifact", List.of())));

    assertThat(stats.getColorDistribution().get("U")).isEqualTo(1);
    assertThat(stats.getColorDistribution().get("R")).isEqualTo(1);
    assertThat(stats.getColorDistribution().get("C")).isEqualTo(1);
    assertThat(stats.getColorDistribution().get("W")).isEqualTo(0);
  }

  @Test
  void averageCmcIgnoresLands() {
    DeckStats stats = calculator.calculate(List.of(
        card("Mountain", 20, 0, "Basic Land — Mountain", List.of()),
        card("Bolt", 1, 1, "Instant", List.of("R")),
        card("Bear", 1, 3, "Creature — Bear", List.of("R"))));

    // (1 + 3) / 2 non-land cards = 2.0
    assertThat(stats.getAverageCmc()).isEqualTo(2.0);
  }

  @Test
  void commander100CardDeckTotalsCorrectly() {
    // 1 commander + 99 cards split across types
    DeckStats stats = calculator.calculate(List.of(
        card("Commander", 1, 4, "Legendary Creature — God", List.of("B", "G")),
        card("Swamp", 18, 0, "Basic Land — Swamp", List.of()),
        card("Forest", 17, 0, "Basic Land — Forest", List.of()),
        card("Ramp Creatures", 30, 2, "Creature — Elf", List.of("G")),
        card("Removal", 20, 3, "Instant", List.of("B")),
        card("Card Draw", 14, 4, "Sorcery", List.of("B"))));

    assertThat(stats.getTotalCards()).isEqualTo(100);
    assertThat(stats.getTypeDistribution().get("Land")).isEqualTo(35);
    assertThat(stats.getTypeDistribution().get("Creature")).isEqualTo(31);
    // 65 non-land cards counted in curve
    int curveTotal = stats.getManaCurve().values().stream().mapToInt(Integer::intValue).sum();
    assertThat(curveTotal).isEqualTo(65);
  }
}
