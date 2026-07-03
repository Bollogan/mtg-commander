package com.mtg.deckbuilder.deck.web;

import com.mtg.deckbuilder.deck.format.Formats;
import com.mtg.deckbuilder.deck.format.Formats.FormatRules;
import com.mtg.deckbuilder.deck.format.LegalityReport;
import com.mtg.deckbuilder.deck.scryfall.ScryfallAutocompleteItem;
import com.mtg.deckbuilder.deck.scryfall.ScryfallCard;
import com.mtg.deckbuilder.deck.scryfall.ScryfallClient;
import com.mtg.deckbuilder.deck.scryfall.ScryfallSearchResult;
import com.mtg.deckbuilder.deck.service.CategoryTemplateService;
import com.mtg.deckbuilder.deck.service.DeckLegalityService;
import com.mtg.deckbuilder.deck.service.DeckService;
import com.mtg.deckbuilder.deck.service.SuggestionService;
import com.mtg.deckbuilder.deck.web.dto.CategoryTemplateDto;
import com.mtg.deckbuilder.deck.web.dto.DeckCategoryDto;
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
  private final DeckLegalityService legalityService;
  private final CategoryTemplateService templateService;

  public DeckController(DeckService deckService,
                        SuggestionService suggestionService,
                        ScryfallClient scryfallClient,
                        DeckLegalityService legalityService,
                        CategoryTemplateService templateService) {
    this.deckService = deckService;
    this.suggestionService = suggestionService;
    this.scryfallClient = scryfallClient;
    this.legalityService = legalityService;
    this.templateService = templateService;
  }

  /** Master data for the supported formats (deck size, copy limits, singleton, …). */
  @GetMapping("/formats")
  public List<FormatRules> formats() {
    return Formats.all();
  }

  /** Advisory legality report for a deck against its format (size, copies, bans, identity, rarity). */
  @GetMapping("/{id}/legality")
  public LegalityReport legality(
      @RequestHeader(value = "X-User-Id", required = false) UUID userId,
      @PathVariable String id) {
    return legalityService.evaluate(deckService.getAuthorized(id, userId));
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

  /** Deck price total across Scryfall's market sources (TCGplayer USD + Cardmarket EUR, incl. foil). */
  @GetMapping("/{id}/prices")
  public com.mtg.deckbuilder.deck.web.dto.DeckPricesDto prices(
      @RequestHeader(value = "X-User-Id", required = false) UUID userId,
      @PathVariable String id) {
    return deckService.prices(id, userId);
  }

  @PostMapping("/{id}/like")
  public DeckDto like(@RequestHeader("X-User-Id") UUID userId, @PathVariable String id) {
    return deckService.like(id, userId);
  }

  @DeleteMapping("/{id}/like")
  public DeckDto unlike(@RequestHeader("X-User-Id") UUID userId, @PathVariable String id) {
    return deckService.unlike(id, userId);
  }

  // ─── Scryfall passthrough (Redis-cached) for the deck builder UI ───────────

  @GetMapping("/cards/search")
  public ScryfallSearchResult searchCards(
      @RequestParam("q") String query,
      @RequestParam(value = "page", defaultValue = "1") int page) {
    return scryfallClient.search(query, page);
  }

  @GetMapping("/cards/autocomplete")
  public List<ScryfallAutocompleteItem> autocompleteCards(
      @RequestParam("q") String query,
      @RequestParam(value = "limit", defaultValue = "8") int limit,
      @RequestParam(value = "commander", defaultValue = "false") boolean commanderOnly) {
    return scryfallClient.autocomplete(query, limit, commanderOnly);
  }

  @GetMapping("/cards/named")
  public ResponseEntity<ScryfallCard> getCardByName(
      @RequestParam("exact") String exactName) {
    ScryfallCard card = scryfallClient.getCardByName(exactName);
    return card == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(card);
  }

  @GetMapping("/cards/{scryfallId}")
  public ResponseEntity<ScryfallCard> getCard(@PathVariable String scryfallId) {
    ScryfallCard card = scryfallClient.getCard(scryfallId);
    return card == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(card);
  }

  /** All printings of a card (by exact name), for the "change printing" picker. */
  @GetMapping("/cards/printings")
  public List<ScryfallCard> printings(@RequestParam("name") String name) {
    return scryfallClient.getPrintings(name);
  }

  // ─── Category templates ────────────────────────────────────────────────────

  @GetMapping("/category-templates")
  public List<CategoryTemplateDto> listTemplates(@RequestHeader(value = "X-User-Id", required = false) UUID userId) {
    return templateService.listForUser(userId);
  }

  @PostMapping("/category-templates")
  public ResponseEntity<CategoryTemplateDto> createTemplate(
      @RequestHeader("X-User-Id") UUID userId,
      @RequestBody CreateTemplateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(templateService.create(userId, request.name(), request.categories()));
  }

  @DeleteMapping("/category-templates/{id}")
  public ResponseEntity<Void> deleteTemplate(
      @RequestHeader("X-User-Id") UUID userId,
      @PathVariable String id) {
    templateService.delete(id, userId);
    return ResponseEntity.noContent().build();
  }

  public record CreateTemplateRequest(String name, List<DeckCategoryDto> categories) {
  }
}
