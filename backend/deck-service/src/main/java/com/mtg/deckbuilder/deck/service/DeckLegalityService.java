package com.mtg.deckbuilder.deck.service;

import com.mtg.deckbuilder.deck.domain.Deck;
import com.mtg.deckbuilder.deck.domain.DeckCard;
import com.mtg.deckbuilder.deck.format.Formats;
import com.mtg.deckbuilder.deck.format.Formats.FormatRules;
import com.mtg.deckbuilder.deck.format.LegalityReport;
import com.mtg.deckbuilder.deck.format.LegalityReport.Violation;
import com.mtg.deckbuilder.deck.scryfall.ScryfallCard;
import com.mtg.deckbuilder.deck.scryfall.ScryfallClient;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Validates a deck against its format's master rules ({@link Formats}). Advisory only — never
 * blocks saving; callers surface the {@link LegalityReport} to the user. Card metadata (legality,
 * rarity, colour identity) is resolved through the Redis-cached {@link ScryfallClient}.
 */
@Service
public class DeckLegalityService {

  private static final Set<String> BASIC_LANDS =
      Set.of("plains", "island", "swamp", "mountain", "forest", "wastes");

  private final ScryfallClient scryfall;

  public DeckLegalityService(ScryfallClient scryfall) {
    this.scryfall = scryfall;
  }

  public LegalityReport evaluate(Deck deck) {
    FormatRules rules = Formats.rulesFor(deck.getFormat());
    List<DeckCard> cards = deck.getCards() == null ? List.of() : deck.getCards();
    int deckSize = cards.stream().mapToInt(DeckCard::getQty).sum();
    List<Violation> violations = new ArrayList<>();

    if (deckSize < rules.minDeckSize()) {
      violations.add(new Violation("SIZE", null,
          "Deck has " + deckSize + " cards; " + rules.label() + " needs at least " + rules.minDeckSize()));
    }
    if (rules.maxDeckSize() != null && deckSize > rules.maxDeckSize()) {
      violations.add(new Violation("SIZE", null,
          "Deck has " + deckSize + " cards; " + rules.label() + " allows at most " + rules.maxDeckSize()));
    }

    Map<String, ScryfallCard> meta = scryfall.getCards(
        cards.stream().map(DeckCard::getScryfallId).toList());

    Set<String> commanderIdentity = validateCommander(deck, rules, violations);

    for (DeckCard dc : cards) {
      ScryfallCard c = meta.get(dc.getScryfallId());
      String name = dc.getName() != null ? dc.getName() : (c != null ? c.name() : dc.getScryfallId());
      boolean basic = isBasic(dc, c);

      if (!basic) {
        int max = rules.singleton() ? 1 : rules.maxCopies();
        boolean restricted = rules.useRestrictedList() && c != null
            && "restricted".equals(legality(c, "vintage"));
        if (restricted) {
          max = 1;
        }
        if (dc.getQty() > max) {
          violations.add(new Violation(restricted ? "RESTRICTED" : "COPIES", name,
              dc.getQty() + " copies; max " + max));
        }
      }

      if (c != null) {
        String leg = legality(c, rules.format());
        if ("banned".equals(leg)) {
          violations.add(new Violation("BANNED", name, "Banned in " + rules.label()));
        } else if ("not_legal".equals(leg)) {
          violations.add(new Violation("NOT_LEGAL", name, "Not legal in " + rules.label()));
        }
        if (rules.commonsOnly() && !basic && c.rarity() != null && !"common".equals(c.rarity())) {
          violations.add(new Violation("RARITY", name, "Not common (" + c.rarity() + ")"));
        }
        if (commanderIdentity != null && c.colorIdentity() != null
            && !commanderIdentity.containsAll(c.colorIdentity())) {
          violations.add(new Violation("COLOR_IDENTITY", name, "Outside the commander's colour identity"));
        }
      }
    }

    return new LegalityReport(rules.format(), rules.label(), violations.isEmpty(),
        deckSize, rules.minDeckSize(), rules.maxDeckSize(), violations);
  }

  /**
   * For commander formats, checks that a commander is named and that the named card can actually be
   * one (adding COMMANDER violations otherwise), and returns its colour identity for the per-card
   * identity check — or {@code null} when the format has no commander or it can't be resolved.
   */
  private Set<String> validateCommander(Deck deck, FormatRules rules, List<Violation> violations) {
    if (!rules.requiresCommander()) {
      return null;
    }
    String name = deck.getCommanderName();
    if (name == null || name.isBlank()) {
      violations.add(new Violation("COMMANDER", null, "This format requires a commander"));
      return null;
    }
    // Eligibility is delegated to Scryfall's authoritative is:commander (FALSE = definitively not a
    // commander; null = couldn't check → skip rather than false-flag a valid one like Shorikai).
    Boolean eligible = scryfall.isValidCommander(name);
    ScryfallCard commander = scryfall.getCardByName(name);
    if (Boolean.FALSE.equals(eligible)) {
      violations.add(new Violation("COMMANDER",
          commander != null ? commander.name() : name, "This card can't be a commander"));
    }
    if (commander == null || commander.colorIdentity() == null) {
      return null;
    }
    return new HashSet<>(commander.colorIdentity());
  }

  private boolean isBasic(DeckCard dc, ScryfallCard c) {
    String type = c != null ? c.typeLine() : dc.getTypeLine();
    if (type != null && type.toLowerCase().contains("basic")) {
      return true;
    }
    String name = dc.getName() != null ? dc.getName().toLowerCase() : "";
    return BASIC_LANDS.contains(name);
  }

  private String legality(ScryfallCard c, String format) {
    return c.legalities() == null ? null : c.legalities().get(format);
  }
}
