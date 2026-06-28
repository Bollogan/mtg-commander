package com.mtg.deckbuilder.deck.synergy;

import com.mtg.deckbuilder.deck.domain.Deck;
import com.mtg.deckbuilder.deck.domain.DeckCard;
import com.mtg.deckbuilder.deck.domain.DeckStats;
import com.mtg.deckbuilder.deck.repo.DeckRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Detects synergies by keyword co-occurrence in Oracle text. Runs asynchronously so a
 * deck save returns immediately (per plan, Fase 3 task 4). The result is persisted back
 * onto the deck's stats once computed.
 */
@Service
public class SynergyService {

  private static final Logger log = LoggerFactory.getLogger(SynergyService.class);
  private static final int MAX_SYNERGIES = 8;
  private static final int MIN_SHARED_CARDS = 2;

  /** MTG ability/theme keywords scanned for in Oracle text. */
  private static final List<String> KEYWORDS = List.of(
      "flying", "trample", "haste", "vigilance", "deathtouch", "lifelink", "menace",
      "reach", "first strike", "double strike", "hexproof", "indestructible", "flash",
      "defender", "ward", "prowess", "scry", "draw a card", "counter target",
      "destroy target", "exile target", "+1/+1 counter", "sacrifice", "graveyard",
      "token", "treasure", "landfall", "convoke", "cascade", "mill", "explore",
      "proliferate", "create a", "whenever you cast", "enters the battlefield");

  private final DeckRepository deckRepository;

  public SynergyService(DeckRepository deckRepository) {
    this.deckRepository = deckRepository;
  }

  /** Recomputes synergies for the given deck and persists them. Fire-and-forget. */
  @Async
  public void computeAndStore(String deckId) {
    try {
      Deck deck = deckRepository.findById(deckId).orElse(null);
      if (deck == null) {
        return;
      }
      List<DeckStats.KeywordSynergy> synergies = detect(deck.getCards());
      DeckStats stats = deck.getStats() == null ? new DeckStats() : deck.getStats();
      stats.setSynergies(synergies);
      deck.setStats(stats);
      deckRepository.save(deck);
      log.debug("Computed {} synergies for deck {}", synergies.size(), deckId);
    } catch (RuntimeException e) {
      log.warn("Synergy computation failed for deck {}: {}", deckId, e.getMessage());
    }
  }

  /** Pure detection logic — counts how many cards share each keyword. */
  public List<DeckStats.KeywordSynergy> detect(List<DeckCard> cards) {
    if (cards == null || cards.isEmpty()) {
      return List.of();
    }
    Map<String, Integer> counts = new LinkedHashMap<>();
    for (DeckCard card : cards) {
      String oracle = card.getOracleText();
      if (oracle == null || oracle.isBlank()) {
        continue;
      }
      String text = oracle.toLowerCase(Locale.ROOT);
      for (String keyword : KEYWORDS) {
        if (text.contains(keyword)) {
          counts.merge(keyword, 1, Integer::sum);
        }
      }
    }
    List<DeckStats.KeywordSynergy> result = new ArrayList<>();
    counts.entrySet().stream()
        .filter(e -> e.getValue() >= MIN_SHARED_CARDS)
        .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
        .limit(MAX_SYNERGIES)
        .forEach(e -> result.add(new DeckStats.KeywordSynergy(e.getKey(), e.getValue())));
    return result;
  }
}
