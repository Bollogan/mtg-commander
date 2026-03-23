package com.mtg.deckbuilder.deck;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/decks")
public class DeckController {
  private final DeckRepository deckRepository;

  public DeckController(DeckRepository deckRepository) {
    this.deckRepository = deckRepository;
  }

  @GetMapping("/me")
  public ResponseEntity<List<DeckSummaryDto>> myDecks(@RequestHeader("X-User-Id") UUID userId) {
    List<DeckSummaryDto> decks = deckRepository.findByOwnerId(userId).stream()
        .map(DeckSummaryDto::from)
        .toList();
    return ResponseEntity.ok(decks);
  }

  @GetMapping("/public")
  public List<DeckSummaryDto> publicDecks() {
    return deckRepository.findByVisibilityOrderByUpdatedAtDesc(DeckVisibility.PUBLIC).stream()
        .map(DeckSummaryDto::from)
        .toList();
  }

  @GetMapping("/search")
  public List<DeckSummaryDto> searchPublicDecks(@RequestParam("q") String query) {
    return deckRepository.findByVisibilityAndNameContainingIgnoreCaseOrderByUpdatedAtDesc(
            DeckVisibility.PUBLIC,
            query)
        .stream()
        .map(DeckSummaryDto::from)
        .toList();
  }

  @PostMapping
  public ResponseEntity<DeckSummaryDto> createDeck(
      @RequestHeader("X-User-Id") UUID userId,
      @RequestHeader(value = "X-User-Name", required = false) String userName,
      @Valid @RequestBody DeckRequest request) {
    DeckEntity deck = new DeckEntity();
    deck.setOwnerId(userId);
    deck.setOwnerName(userName == null || userName.isBlank() ? "Unknown" : userName);
    deck.setName(request.name());
    deck.setFormat(request.format());
    deck.setVisibility(request.visibility() == null ? DeckVisibility.PRIVATE : request.visibility());
    deck.setDescription(request.description());
    deck.setCommanderName(request.commanderName());

    DeckEntity saved = deckRepository.save(deck);
    return ResponseEntity.status(HttpStatus.CREATED).body(DeckSummaryDto.from(saved));
  }

  @GetMapping("/{id}")
  public ResponseEntity<DeckSummaryDto> getDeck(
      @RequestHeader(value = "X-User-Id", required = false) UUID userId,
      @PathVariable UUID id) {
    return deckRepository.findById(id)
        .map(deck -> {
          boolean isOwner = userId != null && deck.getOwnerId().equals(userId);
          boolean isPublic = deck.getVisibility() == DeckVisibility.PUBLIC;
          if (!isOwner && !isPublic) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).<DeckSummaryDto>build();
          }
          return ResponseEntity.ok(DeckSummaryDto.from(deck));
        })
        .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).<DeckSummaryDto>build());
    }
    
  @PutMapping("/{id}")
  public ResponseEntity<DeckSummaryDto> updateDeck(
      @RequestHeader("X-User-Id") UUID userId,
      @PathVariable UUID id,
      @Valid @RequestBody DeckRequest request) {
    return deckRepository.findById(id)
        .map(deck -> {
          if (!deck.getOwnerId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).<DeckSummaryDto>build();
          }
          deck.setName(request.name());
          deck.setFormat(request.format());
          deck.setVisibility(request.visibility() == null ? deck.getVisibility() : request.visibility());
          deck.setDescription(request.description());
          deck.setCommanderName(request.commanderName());
          DeckEntity saved = deckRepository.save(deck);
          return ResponseEntity.ok(DeckSummaryDto.from(saved));
        })
        .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).<DeckSummaryDto>build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteDeck(
      @RequestHeader("X-User-Id") UUID userId,
      @PathVariable UUID id) {
    DeckEntity deck = deckRepository.findById(id).orElse(null);
    if (deck == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
    if (!deck.getOwnerId().equals(userId)) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }
    deckRepository.delete(deck);
    return ResponseEntity.noContent().build();
  }
}
