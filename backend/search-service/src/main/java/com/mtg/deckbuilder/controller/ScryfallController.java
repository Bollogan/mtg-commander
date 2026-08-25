package com.mtg.deckbuilder.controller;

import com.mtg.deckbuilder.dto.CardDto;
import com.mtg.deckbuilder.dto.CardIdRequestDto;
import com.mtg.deckbuilder.dto.EdhrecCategoryDto;
import com.mtg.deckbuilder.dto.RecommanderCategoryDto;
import com.mtg.deckbuilder.dto.SearchResponseDto;
import com.mtg.deckbuilder.dto.TopCommanderDto;
import com.mtg.deckbuilder.service.RecommanderService;
import com.mtg.deckbuilder.service.ScryfallService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/scryfall")
public class ScryfallController {
  private final ScryfallService scryfallService;
  private final RecommanderService recommanderService;

  public ScryfallController(ScryfallService scryfallService,
      RecommanderService recommanderService) {
    this.scryfallService = scryfallService;
    this.recommanderService = recommanderService;
  }

  @GetMapping("/search")
  public SearchResponseDto search(@RequestParam("q") String query,
      @RequestParam(value = "page", defaultValue = "1") int page) {
    return scryfallService.searchCards(query, page);
  }

  @GetMapping("/top-commanders")
  public List<TopCommanderDto> topCommanders(@RequestParam(value = "limit", defaultValue = "20") int limit) {
    return scryfallService.fetchTopCommanders(limit);
  }

  @GetMapping("/cards/{id}")
  public ResponseEntity<CardDto> getCardById(@PathVariable("id") String id) {
    CardDto card = scryfallService.getCardById(id);
    if (card == null) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok(card);
  }

  @GetMapping("/cards/{id}/related")
    public List<CardDto> relatedCards(@PathVariable String id) {
    return scryfallService.getRelatedCards(id);
  }

    @GetMapping("/edhrec/commanders/{slug}")
    public List<EdhrecCategoryDto> commanderEdhrec(@PathVariable String slug,
        @RequestParam(value = "limit", defaultValue = "12") int limit) {
      return scryfallService.getEdhrecCommanderCategories(slug, limit);
    }

    @PostMapping("/cards/collection")
    public List<CardDto> collection(@RequestBody CardIdRequestDto request) {
      return scryfallService.getCardsByIds(request.ids());
    }

    /** Card recommendations for a commander, sourced from recommander.cards (proxied). */
    @GetMapping("/recommander")
    public List<CardDto> recommander(@RequestParam("commander") String commander,
        @RequestParam(value = "limit", defaultValue = "20") int limit) {
      return recommanderService.recommendForCommander(commander, limit);
    }

    /**
     * The same recommendations split into recommander.cards' apartados (Top Picks, Creatures,
     * Artifacts, …, Utility Lands, Lands), capped at {@code perCategory} cards each.
     */
    @GetMapping("/recommander/categories")
    public List<RecommanderCategoryDto> recommanderCategories(
        @RequestParam("commander") String commander,
        @RequestParam(value = "perCategory", defaultValue = "50") int perCategory) {
      return recommanderService.recommendCategories(commander, perCategory);
    }

    /**
     * Deck-aware variant: the caller sends the decklist it already has, and the recommender tunes
     * its answers to that list instead of to the commander alone. A POST because a Commander
     * decklist is ~99 names — too much for a query string.
     */
    @PostMapping("/recommander/categories")
    public List<RecommanderCategoryDto> recommanderCategoriesForDeck(
        @RequestBody RecommanderDeckRequest request) {
      return recommanderService.recommendCategories(
          request.commander(),
          request.perCategory() == null ? RecommanderService.DEFAULT_PER_CATEGORY : request.perCategory(),
          request.deck() == null ? List.of() : request.deck());
    }

    /** Commander plus the names already in the deck; {@code deck} may be empty or absent. */
    public record RecommanderDeckRequest(String commander, List<String> deck, Integer perCategory) {}
}
