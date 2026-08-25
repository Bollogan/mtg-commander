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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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

  /**
   * Resolve one card by name. {@code exact} demands the printed name; {@code fuzzy} tolerates the
   * spelling variations that arrive in pasted decklists. Exactly one of the two must be supplied.
   */
  @GetMapping("/cards/named")
  public ResponseEntity<ScryfallCard> getCardByName(
      @RequestParam(value = "exact", required = false) String exactName,
      @RequestParam(value = "fuzzy", required = false) String fuzzyName) {
    boolean hasExact = exactName != null && !exactName.isBlank();
    boolean hasFuzzy = fuzzyName != null && !fuzzyName.isBlank();
    if (hasExact == hasFuzzy) {
      return ResponseEntity.badRequest().build();
    }
    ScryfallCard card = hasExact
        ? scryfallClient.getCardByName(exactName)
        : scryfallClient.getCardByFuzzyName(fuzzyName);
    return card == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(card);
  }

  /**
   * Bulk name resolution for the decklist importer: takes the names of a whole decklist and
   * answers with the cards it could resolve plus the names it could not, in one round trip
   * instead of one request per line.
   */
  @PostMapping("/cards/named-collection")
  public ResolvedNamesResponse resolveNames(@RequestBody CardNamesRequest request) {
    List<String> names = request.names() == null ? List.of() : request.names();
    if (names.isEmpty()) {
      return new ResolvedNamesResponse(List.of(), List.of());
    }
    // Guard against a pathological paste; a Commander decklist has ~100 distinct names.
    List<String> requested = names.stream()
        .filter(n -> n != null && !n.isBlank())
        .map(String::trim)
        .distinct()
        .limit(500)
        .toList();

    Map<String, ScryfallCard> byName = scryfallClient.getCardsByNames(requested);
    List<ResolvedCard> resolved = new ArrayList<>();
    List<String> unresolved = new ArrayList<>();
    for (String name : requested) {
      ScryfallCard card = byName.get(name.toLowerCase());
      // A name the bulk endpoint missed is usually a spelling variant — retry it fuzzily, which
      // is cheap because only the leftovers get an individual request.
      if (card == null) {
        card = scryfallClient.getCardByFuzzyName(name);
      }
      if (card == null) {
        unresolved.add(name);
      } else {
        resolved.add(new ResolvedCard(name, card));
      }
    }
    return new ResolvedNamesResponse(resolved, unresolved);
  }

  /** Names to resolve, as parsed from a pasted decklist. */
  public record CardNamesRequest(List<String> names) {}

  /** A resolved line: the name as written in the list, and the card it resolved to. */
  public record ResolvedCard(String requested, ScryfallCard card) {}

  /** Bulk resolution outcome — everything found, plus the names that matched nothing. */
  public record ResolvedNamesResponse(List<ResolvedCard> resolved, List<String> unresolved) {}

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

  /**
   * Whether the named card can legally be a commander (Scryfall's authoritative is:commander).
   * {@code eligible} is null when it can't be resolved, so the UI skips the check.
   */
  @GetMapping("/cards/commander-eligible")
  public CommanderEligibility commanderEligible(@RequestParam("name") String name) {
    return new CommanderEligibility(scryfallClient.isValidCommander(name));
  }

  public record CommanderEligibility(Boolean eligible) {
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
