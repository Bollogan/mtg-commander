package com.mtg.deckbuilder.controller;

import com.mtg.deckbuilder.dto.CardDto;
import com.mtg.deckbuilder.dto.CardIdRequestDto;
import com.mtg.deckbuilder.dto.EdhrecCategoryDto;
import com.mtg.deckbuilder.dto.SearchResponseDto;
import com.mtg.deckbuilder.dto.TopCommanderDto;
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

  public ScryfallController(ScryfallService scryfallService) {
    this.scryfallService = scryfallService;
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
}
