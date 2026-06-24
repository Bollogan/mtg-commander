package com.mtg.deckbuilder.ai.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Reads deck data (cards + precomputed synergies) from deck-service. Used to build the
 * co-occurrence fallback when the external AI model is unavailable.
 */
@FeignClient(name = "deck-service", path = "/api/decks")
public interface DeckClient {

  @GetMapping("/{id}")
  DeckView getDeck(@PathVariable("id") String id);
}
