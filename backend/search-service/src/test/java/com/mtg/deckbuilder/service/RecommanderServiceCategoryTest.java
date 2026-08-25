package com.mtg.deckbuilder.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.mtg.deckbuilder.dto.CardDto;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Covers the apartado taxonomy that mirrors recommander.cards, in particular the split the plain
 * card-type grouping could not express: utility lands versus plain mana lands.
 */
class RecommanderServiceCategoryTest {

  private static CardDto card(String name, String typeLine, String oracleText) {
    return new CardDto("id-" + name, name, null, 0, List.of(), List.of(), typeLine, oracleText,
        null, null, null, null, null, Map.of(), Map.of(), null, null, Map.of(), List.of());
  }

  @Test
  void filesEachCardUnderItsPrintedType() {
    assertThat(RecommanderService.categoryOf(card("Llanowar Elves", "Creature — Elf Druid", "{T}: Add {G}.")))
        .isEqualTo("creatures");
    assertThat(RecommanderService.categoryOf(card("Counterspell", "Instant", "Counter target spell.")))
        .isEqualTo("instants");
    assertThat(RecommanderService.categoryOf(card("Cultivate", "Sorcery", "Search your library…")))
        .isEqualTo("sorceries");
    assertThat(RecommanderService.categoryOf(card("Sol Ring", "Artifact", "{T}: Add {C}{C}.")))
        .isEqualTo("artifacts");
    assertThat(RecommanderService.categoryOf(card("Rhystic Study", "Enchantment", "Whenever an opponent…")))
        .isEqualTo("enchantments");
    assertThat(RecommanderService.categoryOf(card("Teferi", "Legendary Planeswalker — Teferi", "+1: …")))
        .isEqualTo("planeswalkers");
    assertThat(RecommanderService.categoryOf(card("Invasion of Ravnica", "Battle — Siege", "…")))
        .isEqualTo("battles");
  }

  @Test
  void prefersTheCreatureTypeOverTheArtifactOrEnchantmentItAlsoIs() {
    assertThat(RecommanderService.categoryOf(
        card("Solemn Simulacrum", "Artifact Creature — Golem", "When this enters, search…")))
        .isEqualTo("creatures");
    assertThat(RecommanderService.categoryOf(
        card("Sythis", "Legendary Enchantment Creature — Nymph", "Whenever you cast…")))
        .isEqualTo("creatures");
  }

  @Test
  void filesModalDoubleFacedSpellsByTheirFrontFace() {
    // "Sorcery // Land" must not be read as a land just because the back face is one.
    assertThat(RecommanderService.categoryOf(card("Agadeem's Awakening", "Sorcery // Land", "Return…")))
        .isEqualTo("sorceries");
  }

  @Test
  void deckSignatureIgnoresOrderButNotContents() {
    // The same 99 cards shuffled is the same query, so it must reuse the cached answer.
    assertThat(RecommanderService.deckSignature(List.of("Sol Ring", "Command Tower")))
        .isEqualTo(RecommanderService.deckSignature(List.of("Command Tower", "Sol Ring")));
    assertThat(RecommanderService.deckSignature(List.of("Sol Ring")))
        .isNotEqualTo(RecommanderService.deckSignature(List.of("Sol Ring", "Command Tower")));
    assertThat(RecommanderService.deckSignature(List.of())).isEqualTo("no-deck");
  }

  @Test
  void cleanDeckDropsBlanksAndDuplicates() {
    assertThat(RecommanderService.cleanDeck(List.of("Sol Ring", " Sol Ring ", "", "  ", "Forest")))
        .containsExactly("Sol Ring", "Forest");
    assertThat(RecommanderService.cleanDeck(null)).isEmpty();
  }

  @Test
  void separatesUtilityLandsFromPlainManaLands() {
    assertThat(RecommanderService.categoryOf(
        card("Command Tower", "Land", "{T}: Add one mana of any color in your commander's color identity.")))
        .isEqualTo("lands");
    assertThat(RecommanderService.categoryOf(card("Forest", "Basic Land — Forest", "({T}: Add {G}.)")))
        .isEqualTo("lands");
    assertThat(RecommanderService.categoryOf(
        card("Hallowed Fountain", "Land — Plains Island",
            "({T}: Add {W} or {U}.)\nHallowed Fountain enters tapped unless you pay 2 life.")))
        .isEqualTo("lands");
    assertThat(RecommanderService.categoryOf(
        card("Flooded Strand", "Land",
            "{T}, Pay 1 life, Sacrifice this land: Search your library for a Plains or Island card, "
                + "put it onto the battlefield, then shuffle.")))
        .isEqualTo("lands");

    assertThat(RecommanderService.categoryOf(
        card("Reliquary Tower", "Land", "You have no maximum hand size.\n{T}: Add {C}.")))
        .isEqualTo("utility-lands");
    assertThat(RecommanderService.categoryOf(
        card("Bojuka Bog", "Land",
            "Bojuka Bog enters tapped.\nWhen Bojuka Bog enters, exile target player's graveyard.\n{T}: Add {B}.")))
        .isEqualTo("utility-lands");
  }
}
