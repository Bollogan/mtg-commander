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
import com.mtg.deckbuilder.deck.web.dto.DeckPricesDto;
import com.mtg.deckbuilder.deck.web.dto.DeckRequest;
import com.mtg.deckbuilder.deck.web.dto.DeckSummaryDto;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class DeckService {

  private static final Logger log = LoggerFactory.getLogger(DeckService.class);

  private final DeckRepository deckRepository;
  private final ScryfallClient scryfallClient;
  private final DeckStatsCalculator statsCalculator;
  private final SynergyService synergyService;
  private final UserClient userClient;
  private final StringRedisTemplate redis;

  public DeckService(DeckRepository deckRepository,
                     ScryfallClient scryfallClient,
                     DeckStatsCalculator statsCalculator,
                     SynergyService synergyService,
                     UserClient userClient,
                     StringRedisTemplate redis) {
    this.deckRepository = deckRepository;
    this.scryfallClient = scryfallClient;
    this.statsCalculator = statsCalculator;
    this.synergyService = synergyService;
    this.userClient = userClient;
    this.redis = redis;
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
    Deck deck = getAuthorized(id, requesterId);
    registerView(deck, requesterId);
    return enrich(deck, requesterId);
  }

  /** Counts a unique non-owner view, deduplicated by user via a Redis set. */
  private void registerView(Deck deck, UUID requesterId) {
    if (requesterId == null || requesterId.equals(deck.getOwnerId())) {
      return;
    }
    try {
      Long added = redis.opsForSet().add("deck:viewers:" + deck.getId(), requesterId.toString());
      if (added != null && added > 0) {
        deck.setViews(deck.getViews() + 1);
        deckRepository.save(deck);
      }
    } catch (RuntimeException e) {
      // A view counter must never break loading a deck.
      log.debug("view increment skipped for {}: {}", deck.getId(), e.getMessage());
    }
  }

  /** Toggle a like on a public deck (idempotent add). */
  public DeckDto like(String id, UUID userId) {
    Deck deck = require(id);
    if (!deck.isPublic()) {
      throw new ForbiddenException("Only public decks can be liked");
    }
    if (deck.getLikedBy() == null) {
      deck.setLikedBy(new ArrayList<>());
    }
    if (!deck.getLikedBy().contains(userId)) {
      deck.getLikedBy().add(userId);
      deckRepository.save(deck);
    }
    return enrich(deck, userId);
  }

  public DeckDto unlike(String id, UUID userId) {
    Deck deck = require(id);
    if (deck.getLikedBy() != null && deck.getLikedBy().remove(userId)) {
      deckRepository.save(deck);
    }
    return enrich(deck, userId);
  }

  /** Deck total across Scryfall market sources (TCGplayer USD + Cardmarket EUR, incl. foil). */
  public DeckPricesDto prices(String id, UUID requesterId) {
    Deck deck = getAuthorized(id, requesterId);
    List<String> ids = deck.getCards().stream().map(DeckCard::getScryfallId).toList();
    Map<String, ScryfallCard> resolved = scryfallClient.getCards(ids);
    double usd = 0, usdFoil = 0, eur = 0, eurFoil = 0, tix = 0;
    int missingUsd = 0, missingEur = 0, total = 0;
    for (DeckCard c : deck.getCards()) {
      int qty = c.getQty();
      total += qty;
      ScryfallCard sc = resolved.get(c.getScryfallId());
      ScryfallCard.Prices p = sc != null ? sc.prices() : null;
      if (p == null) {
        missingUsd += qty;
        missingEur += qty;
        continue;
      }
      if (p.usd() != null) { usd += p.usd() * qty; } else { missingUsd += qty; }
      if (p.eur() != null) { eur += p.eur() * qty; } else { missingEur += qty; }
      // Foil totals fall back to the non-foil price when a foil price is unavailable.
      Double foilUsd = p.usdFoil() != null ? p.usdFoil() : p.usd();
      Double foilEur = p.eurFoil() != null ? p.eurFoil() : p.eur();
      if (foilUsd != null) { usdFoil += foilUsd * qty; }
      if (foilEur != null) { eurFoil += foilEur * qty; }
      if (p.tix() != null) { tix += p.tix() * qty; }
    }
    return new DeckPricesDto(round(usd), round(usdFoil), round(eur), round(eurFoil), round(tix),
        missingUsd, missingEur, total);
  }

  private static double round(double v) {
    return Math.round(v * 100.0) / 100.0;
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
    return enrich(saved, ownerId);
  }

  public DeckDto update(String id, UUID requesterId, DeckRequest request) {
    Deck deck = require(id);
    if (!deck.getOwnerId().equals(requesterId)) {
      throw new ForbiddenException("Only the owner can edit this deck");
    }
    applyRequest(deck, request);
    Deck saved = persistWithStats(deck);
    return enrich(saved, requesterId);
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
    deck.setCategories(resolveCategories(request.categories()));
  }

  private List<com.mtg.deckbuilder.deck.domain.DeckCategory> resolveCategories(
      List<com.mtg.deckbuilder.deck.web.dto.DeckCategoryDto> dtos) {
    if (dtos == null || dtos.isEmpty()) {
      return new ArrayList<>();
    }
    return dtos.stream().map(com.mtg.deckbuilder.deck.web.dto.DeckCategoryDto::toDomain).toList();
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
      card.setFoil(entry.foil());
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

  /** Enriches with the owner's current profile via Feign + per-card prices; degrades gracefully. */
  private DeckDto enrich(Deck deck, UUID requesterId) {
    Map<String, ScryfallCard.Prices> prices = resolvePrices(deck);
    try {
      UserSummary user = userClient.getUser(deck.getOwnerId());
      if (user != null) {
        return DeckDto.from(deck, user.displayName(), user.avatarUrl(), requesterId, prices);
      }
    } catch (RuntimeException e) {
      log.debug("user-service enrichment unavailable for {}: {}",
          deck.getOwnerId(), e.getMessage());
    }
    return DeckDto.from(deck, deck.getOwnerName(), null, requesterId, prices);
  }

  /** Resolves current Scryfall prices for the deck's cards (Redis-cached batch). */
  private Map<String, ScryfallCard.Prices> resolvePrices(Deck deck) {
    try {
      List<String> ids = deck.getCards().stream().map(DeckCard::getScryfallId).toList();
      Map<String, ScryfallCard> resolved = scryfallClient.getCards(ids);
      Map<String, ScryfallCard.Prices> out = new java.util.HashMap<>();
      resolved.forEach((id, sc) -> out.put(id, sc.prices()));
      return out;
    } catch (RuntimeException e) {
      log.debug("price resolution unavailable for {}: {}", deck.getId(), e.getMessage());
      return Map.of();
    }
  }
}
