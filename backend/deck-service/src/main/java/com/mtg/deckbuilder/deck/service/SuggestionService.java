package com.mtg.deckbuilder.deck.service;

import com.mtg.deckbuilder.deck.client.AiClient;
import com.mtg.deckbuilder.deck.client.AiClient.AiRecommendRequest;
import com.mtg.deckbuilder.deck.client.AiClient.AiRecommendResponse;
import com.mtg.deckbuilder.deck.domain.Deck;
import com.mtg.deckbuilder.deck.domain.DeckCard;
import com.mtg.deckbuilder.deck.domain.DeckStats;
import com.mtg.deckbuilder.deck.scryfall.ScryfallCard;
import com.mtg.deckbuilder.deck.scryfall.ScryfallClient;
import com.mtg.deckbuilder.deck.scryfall.ScryfallSearchResult;
import com.mtg.deckbuilder.deck.web.dto.SuggestionDto;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Produces card suggestions for a deck. Tries ai-service first (Fase 4); if it is
 * unavailable, falls back to a local mock derived from the deck's top synergy keyword
 * via Scryfall search. Per plan Fase 3 task 5.
 */
@Service
public class SuggestionService {

  private static final Logger log = LoggerFactory.getLogger(SuggestionService.class);
  private static final int MAX_SUGGESTIONS = 6;

  private final AiClient aiClient;
  private final ScryfallClient scryfallClient;

  public SuggestionService(AiClient aiClient, ScryfallClient scryfallClient) {
    this.aiClient = aiClient;
    this.scryfallClient = scryfallClient;
  }

  public List<SuggestionDto> suggestionsFor(Deck deck) {
    List<String> cardIds = deck.getCards().stream().map(DeckCard::getScryfallId).toList();
    try {
      AiRecommendResponse response = aiClient.recommend(
          new AiRecommendRequest(deck.getId(), deck.getFormat(), cardIds));
      if (response != null && response.suggestions() != null && !response.suggestions().isEmpty()) {
        return response.suggestions().stream()
            .map(s -> new SuggestionDto(s.scryfallId(), s.name(), null, s.reason(), "ai"))
            .limit(MAX_SUGGESTIONS)
            .toList();
      }
    } catch (RuntimeException e) {
      log.debug("ai-service unavailable, using mock suggestions: {}", e.getMessage());
    }
    return mockSuggestions(deck);
  }

  /** Deterministic local fallback based on the deck's dominant synergy keyword. */
  private List<SuggestionDto> mockSuggestions(Deck deck) {
    DeckStats stats = deck.getStats();
    if (stats == null || stats.getSynergies() == null || stats.getSynergies().isEmpty()) {
      return List.of();
    }
    String keyword = stats.getSynergies().get(0).keyword();
    Set<String> owned = deck.getCards().stream()
        .map(DeckCard::getScryfallId)
        .collect(Collectors.toSet());

    ScryfallSearchResult result = scryfallClient.search("oracle:\"" + keyword + "\"", 1);
    List<SuggestionDto> suggestions = new ArrayList<>();
    for (ScryfallCard card : result.cards()) {
      if (owned.contains(card.id())) {
        continue;
      }
      suggestions.add(new SuggestionDto(
          card.id(),
          card.name(),
          card.imageUris() != null ? card.imageUris().normal() : null,
          "Synergizes with your '" + keyword + "' theme",
          "mock"));
      if (suggestions.size() >= MAX_SUGGESTIONS) {
        break;
      }
    }
    return suggestions;
  }
}
