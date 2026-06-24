package com.mtg.deckbuilder.deck.service;

import com.mtg.deckbuilder.deck.client.UserClient;
import com.mtg.deckbuilder.deck.client.UserSummary;
import com.mtg.deckbuilder.deck.domain.Deck;
import com.mtg.deckbuilder.deck.domain.DeckCard;
import com.mtg.deckbuilder.deck.domain.DeckVisibility;
import com.mtg.deckbuilder.deck.repo.DeckRepository;
import com.mtg.deckbuilder.deck.scryfall.ScryfallCard;
import com.mtg.deckbuilder.deck.scryfall.ScryfallClient;
import com.mtg.deckbuilder.deck.stats.DeckStatsCalculator;
import com.mtg.deckbuilder.deck.synergy.SynergyService;
import com.mtg.deckbuilder.deck.web.ApiExceptions.ForbiddenException;
import com.mtg.deckbuilder.deck.web.ApiExceptions.NotFoundException;
import com.mtg.deckbuilder.deck.web.dto.CardEntryRequest;
import com.mtg.deckbuilder.deck.web.dto.DeckDto;
import com.mtg.deckbuilder.deck.web.dto.DeckRequest;
import com.mtg.deckbuilder.deck.web.dto.DeckSummaryDto;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class DeckService {

  private static final Logger log = LoggerFactory.getLogger(DeckService.class);

  private final DeckRepository deckRepository;
  private final ScryfallClient scryfallClient;
  private final DeckStatsCalculator statsCalculator;
  private final SynergyService synergyService;
  private final UserClient userClient;

  public DeckService(DeckRepository deckRepository,
                     ScryfallClient scryfallClient,
                     DeckStatsCalculator statsCalculator,
                     SynergyService synergyService,
                     UserClient userClient) {
    this.deckRepository = deckRepository;
    this.scryfallClient = scryfallClient;
    this.statsCalculator = statsCalculator;
    this.synergyService = synergyService;
    this.userClient = userClient;
  }

  public List<DeckSummaryDto> myDecks(UUID ownerId) {
    return deckRepository.findByOwnerIdOrderByUpdatedAtDesc(ownerId).stream()
        .map(DeckSummaryDto::from)
        .toList();
  }

  public List<DeckSummaryDto> publicDecks() {
    return deckRepository.findByVisibilityOrderByUpdatedAtDesc(DeckVisibility.PUBLIC).stream()
        .map(DeckSummaryDto::from)
        .toList();
  }

  public List<DeckSummaryDto> searchPublic(String query) {
    return deckRepository
        .findByVisibilityAndNameContainingIgnoreCaseOrderByUpdatedAtDesc(
            DeckVisibility.PUBLIC, query == null ? "" : query)
        .stream()
        .map(DeckSummaryDto::from)
        .toList();
  }

  public DeckDto get(String id, UUID requesterId) {
    return enrich(getAuthorized(id, requesterId));
  }

  /** Loads a deck enforcing the read visibility rules; used by suggestions too. */
  public Deck getAuthorized(String id, UUID requesterId) {
    Deck deck = require(id);
    boolean isOwner = requesterId != null && requesterId.equals(deck.getOwnerId());
    if (!isOwner && !deck.isPublic()) {
      throw new ForbiddenException("Deck is not public");
    }
    return deck;
  }

  public DeckDto create(UUID ownerId, String ownerName, DeckRequest request) {
    Deck deck = new Deck();
    deck.setOwnerId(ownerId);
    deck.setOwnerName(ownerName == null || ownerName.isBlank() ? "Unknown" : ownerName);
    deck.setCreatedAt(Instant.now());
    applyRequest(deck, request);
    Deck saved = persistWithStats(deck);
    return enrich(saved);
  }

  public DeckDto update(String id, UUID requesterId, DeckRequest request) {
    Deck deck = require(id);
    if (!deck.getOwnerId().equals(requesterId)) {
      throw new ForbiddenException("Only the owner can edit this deck");
    }
    applyRequest(deck, request);
    Deck saved = persistWithStats(deck);
    return enrich(saved);
  }

  public void delete(String id, UUID requesterId) {
    Deck deck = require(id);
    if (!deck.getOwnerId().equals(requesterId)) {
      throw new ForbiddenException("Only the owner can delete this deck");
    }
    deckRepository.delete(deck);
  }

  Deck require(String id) {
    return deckRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("Deck not found: " + id));
  }

  private void applyRequest(Deck deck, DeckRequest request) {
    deck.setName(request.name());
    deck.setFormat(request.format());
    if (request.visibility() != null) {
      deck.setVisibility(request.visibility());
    }
    deck.setDescription(request.description());
    deck.setCommanderName(request.commanderName());
    deck.setCards(resolveCards(request.cards()));
  }

  /** Resolves card snapshots from Scryfall (read-through Redis cache). */
  private List<DeckCard> resolveCards(List<CardEntryRequest> entries) {
    List<DeckCard> cards = new ArrayList<>();
    if (entries == null || entries.isEmpty()) {
      return cards;
    }
    List<String> ids = entries.stream().map(CardEntryRequest::scryfallId).toList();
    Map<String, ScryfallCard> resolved = scryfallClient.getCards(ids);
    for (CardEntryRequest entry : entries) {
      DeckCard card = new DeckCard(entry.scryfallId(), entry.qty());
      card.setCategory(entry.category());
      ScryfallCard sc = resolved.get(entry.scryfallId());
      if (sc != null) {
        card.setName(sc.name());
        card.setManaCost(sc.manaCost());
        card.setCmc(sc.cmc());
        card.setTypeLine(sc.typeLine());
        card.setColors(sc.colors());
        card.setOracleText(sc.oracleText());
        card.setImageUrl(sc.imageUris() != null ? sc.imageUris().normal() : null);
      } else {
        log.warn("Could not resolve Scryfall card {} — keeping id/qty only", entry.scryfallId());
      }
      cards.add(card);
    }
    return cards;
  }

  /** Computes stats synchronously, persists, then kicks off async synergy detection. */
  private Deck persistWithStats(Deck deck) {
    deck.setStats(statsCalculator.calculate(deck.getCards()));
    deck.setUpdatedAt(Instant.now());
    Deck saved = deckRepository.save(deck);
    synergyService.computeAndStore(saved.getId());
    return saved;
  }

  /** Enriches with the owner's current profile via Feign; degrades gracefully. */
  private DeckDto enrich(Deck deck) {
    try {
      UserSummary user = userClient.getUser(deck.getOwnerId());
      if (user != null) {
        return DeckDto.from(deck, user.displayName(), user.avatarUrl());
      }
    } catch (RuntimeException e) {
      log.debug("user-service enrichment unavailable for {}: {}",
          deck.getOwnerId(), e.getMessage());
    }
    return DeckDto.from(deck);
  }
}
