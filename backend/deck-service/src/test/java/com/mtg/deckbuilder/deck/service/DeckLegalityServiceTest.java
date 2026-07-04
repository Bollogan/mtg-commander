package com.mtg.deckbuilder.deck.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.mtg.deckbuilder.deck.domain.Deck;
import com.mtg.deckbuilder.deck.domain.DeckCard;
import com.mtg.deckbuilder.deck.format.LegalityReport;
import com.mtg.deckbuilder.deck.format.LegalityReport.Violation;
import com.mtg.deckbuilder.deck.scryfall.ScryfallCard;
import com.mtg.deckbuilder.deck.scryfall.ScryfallClient;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DeckLegalityServiceTest {

  private final ScryfallClient scryfall = mock(ScryfallClient.class);
  private final DeckLegalityService service = new DeckLegalityService(scryfall);

  private ScryfallCard card(String id, String name, String type, String rarity,
                            List<String> identity, Map<String, String> legalities) {
    return new ScryfallCard(id, name, "", 0, List.of(), identity, type, "", null, null,
        null, "Set", rarity, legalities, null);
  }

  private DeckCard entry(String id, String name, String type, int qty) {
    DeckCard dc = new DeckCard(id, qty);
    dc.setName(name);
    dc.setTypeLine(type);
    return dc;
  }

  private Deck deck(String format, String commander, DeckCard... cards) {
    Deck d = new Deck();
    d.setFormat(format);
    d.setCommanderName(commander);
    d.setCards(new ArrayList<>(List.of(cards)));
    return d;
  }

  private List<String> types(LegalityReport report) {
    return report.violations().stream().map(Violation::type).toList();
  }

  @Test
  void commanderIsSingletonButBasicLandsAreExempt() {
    when(scryfall.getCards(any())).thenReturn(Map.of(
        "sol", card("sol", "Sol Ring", "Artifact", "uncommon", List.of(), Map.of("commander", "legal")),
        "forest", card("forest", "Forest", "Basic Land — Forest", "common", List.of("G"), Map.of("commander", "legal"))));

    LegalityReport report = service.evaluate(deck("commander", null,
        entry("sol", "Sol Ring", "Artifact", 2),
        entry("forest", "Forest", "Basic Land — Forest", 40)));

    // Sol Ring x2 breaks singleton; 40 Forests do not.
    List<Violation> copies = report.violations().stream()
        .filter(v -> "COPIES".equals(v.type())).toList();
    assertThat(copies).extracting(Violation::cardName).containsExactly("Sol Ring");
  }

  @Test
  void pauperRejectsNonCommonCards() {
    when(scryfall.getCards(any())).thenReturn(Map.of(
        "r1", card("r1", "Fancy Rare", "Creature", "rare", List.of(), Map.of("pauper", "not_legal"))));

    LegalityReport report = service.evaluate(deck("pauper", null,
        entry("r1", "Fancy Rare", "Creature", 1)));

    assertThat(types(report)).contains("RARITY");
  }

  @Test
  void bannedCardIsFlaggedForItsFormat() {
    when(scryfall.getCards(any())).thenReturn(Map.of(
        "b1", card("b1", "Broken Card", "Sorcery", "mythic", List.of(), Map.of("modern", "banned"))));

    LegalityReport report = service.evaluate(deck("modern", null,
        entry("b1", "Broken Card", "Sorcery", 1)));

    assertThat(types(report)).contains("BANNED");
  }

  @Test
  void nonCommanderCardCannotBeCommander() {
    when(scryfall.isValidCommander("Sol Ring")).thenReturn(false);
    when(scryfall.getCardByName("Sol Ring"))
        .thenReturn(card("sol", "Sol Ring", "Artifact", "uncommon",
            List.of(), Map.of("commander", "legal")));
    when(scryfall.getCards(any())).thenReturn(Map.of());

    LegalityReport report = service.evaluate(deck("commander", "Sol Ring"));

    assertThat(report.violations()).anyMatch(v ->
        "COMMANDER".equals(v.type()) && "Sol Ring".equals(v.cardName()));
  }

  @Test
  void commanderFormatRequiresACommander() {
    when(scryfall.getCards(any())).thenReturn(Map.of());

    LegalityReport report = service.evaluate(deck("commander", null,
        entry("u1", "Blue Spell", "Instant", 1)));

    assertThat(report.violations()).anyMatch(v ->
        "COMMANDER".equals(v.type()) && v.cardName() == null);
  }

  @Test
  void legendaryCreatureIsAValidCommander() {
    when(scryfall.isValidCommander("Gruul Commander")).thenReturn(true);
    when(scryfall.getCardByName("Gruul Commander"))
        .thenReturn(card("cmd", "Gruul Commander", "Legendary Creature", "mythic",
            List.of("R", "G"), Map.of("commander", "legal")));
    when(scryfall.getCards(any())).thenReturn(Map.of());

    LegalityReport report = service.evaluate(deck("commander", "Gruul Commander"));

    assertThat(types(report)).doesNotContain("COMMANDER");
  }

  @Test
  void legendaryVehicleCommanderIsAcceptedViaScryfall() {
    // Shorikai, Genesis Engine: a Legendary Artifact — Vehicle whose oracle text does NOT say
    // "can be your commander", yet is a legal commander — a heuristic would wrongly reject it.
    when(scryfall.isValidCommander("Shorikai, Genesis Engine")).thenReturn(true);
    when(scryfall.getCardByName("Shorikai, Genesis Engine"))
        .thenReturn(card("sho", "Shorikai, Genesis Engine", "Legendary Artifact — Vehicle",
            "mythic", List.of("W", "U"), Map.of("commander", "legal")));
    when(scryfall.getCards(any())).thenReturn(Map.of());

    LegalityReport report = service.evaluate(deck("commander", "Shorikai, Genesis Engine"));

    assertThat(types(report)).doesNotContain("COMMANDER");
  }

  @Test
  void commanderEligibilityIsSkippedWhenScryfallCantResolve() {
    when(scryfall.isValidCommander("Mystery Card")).thenReturn(null);
    when(scryfall.getCards(any())).thenReturn(Map.of());

    LegalityReport report = service.evaluate(deck("commander", "Mystery Card"));

    assertThat(types(report)).doesNotContain("COMMANDER");
  }

  @Test
  void commanderColorIdentityIsEnforced() {
    when(scryfall.isValidCommander("Gruul Commander")).thenReturn(true);
    when(scryfall.getCardByName("Gruul Commander"))
        .thenReturn(card("cmd", "Gruul Commander", "Legendary Creature", "mythic",
            List.of("R", "G"), Map.of("commander", "legal")));
    when(scryfall.getCards(any())).thenReturn(Map.of(
        "u1", card("u1", "Blue Spell", "Instant", "common", List.of("U"), Map.of("commander", "legal"))));

    LegalityReport report = service.evaluate(deck("commander", "Gruul Commander",
        entry("u1", "Blue Spell", "Instant", 1)));

    assertThat(types(report)).contains("COLOR_IDENTITY");
  }
}
