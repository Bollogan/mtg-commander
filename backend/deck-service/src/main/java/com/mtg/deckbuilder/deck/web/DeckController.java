package com.mtg.deckbuilder.deck.web;

import com.mtg.deckbuilder.deck.scryfall.ScryfallCard;
import com.mtg.deckbuilder.deck.scryfall.ScryfallClient;
import com.mtg.deckbuilder.deck.scryfall.ScryfallSearchResult;
import com.mtg.deckbuilder.deck.service.DeckService;
import com.mtg.deckbuilder.deck.service.SuggestionService;
import com.mtg.deckbuilder.deck.web.dto.DeckDto;
import com.mtg.deckbuilder.deck.web.dto.DeckRequest;
import com.mtg.deckbuilder.deck.web.dto.DeckSummaryDto;
import com.mtg.deckbuilder.deck.web.dto.SuggestionDto;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/decks")
public class DeckController {

  private final DeckService deckService;
  private final SuggestionService suggestionService;
  private final ScryfallClient scryfallClient;

  public DeckController(DeckService deckService,
                        SuggestionService suggestionService,
                        ScryfallClient scryfallClient) {
    this.deckService = deckService;
    this.suggestionService = suggestionService;
    this.scryfallClient = scryfallClient;
  }

  @GetMapping("/me")
  public List<DeckSummaryDto> myDecks(@RequestHeader("X-User-Id") UUID userId) {
    return deckService.myDecks(userId);
  }

  @GetMapping("/public")
  public List<DeckSummaryDto> publicDecks() {
    return deckService.publicDecks();
  }

  @GetMapping("/search")
  public List<DeckSummaryDto> searchPublicDecks(@RequestParam("q") String query) {
    return deckService.searchPublic(query);
  }

  @PostMapping
  public ResponseEntity<DeckDto> createDeck(
      @RequestHeader("X-User-Id") UUID userId,
      @RequestHeader(value = "X-User-Name", required = false) String userName,
      @Valid @RequestBody DeckRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(deckService.create(userId, userName, request));
  }

  @GetMapping("/{id}")
  public DeckDto getDeck(
      @RequestHeader(value = "X-User-Id", required = false) UUID userId,
      @PathVariable String id) {
    return deckService.get(id, userId);
  }

  @PutMapping("/{id}")
  public DeckDto updateDeck(
      @RequestHeader("X-User-Id") UUID userId,
      @PathVariable String id,
      @Valid @RequestBody DeckRequest request) {
    return deckService.update(id, userId, request);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteDeck(
      @RequestHeader("X-User-Id") UUID userId,
      @PathVariable String id) {
    deckService.delete(id, userId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}/suggestions")
  public List<SuggestionDto> suggestions(
      @RequestHeader(value = "X-User-Id", required = false) UUID userId,
      @PathVariable String id) {
    // getAuthorized enforces the same visibility/ownership rules as GET /{id}.
    return suggestionService.suggestionsFor(deckService.getAuthorized(id, userId));
  }

  // ─── Scryfall passthrough (Redis-cached) for the deck builder UI ───────────

  @GetMapping("/cards/search")
  public ScryfallSearchResult searchCards(
      @RequestParam("q") String query,
      @RequestParam(value = "page", defaultValue = "1") int page) {
    return scryfallClient.search(query, page);
  }

  @GetMapping("/cards/{scryfallId}")
  public ResponseEntity<ScryfallCard> getCard(@PathVariable String scryfallId) {
    ScryfallCard card = scryfallClient.getCard(scryfallId);
    return card == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(card);
  }
}
