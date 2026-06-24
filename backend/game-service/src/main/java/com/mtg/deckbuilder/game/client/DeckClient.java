package com.mtg.deckbuilder.game.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * Loads a deck from deck-service to seed a player's library. Resolved by Eureka name. The
 * caller's user id is forwarded so deck-service can authorize private decks.
 */
@FeignClient(name = "deck-service", path = "/api/decks")
public interface DeckClient {

  @GetMapping("/{id}")
  DeckView getDeck(@PathVariable("id") String id,
                   @RequestHeader(value = "X-User-Id", required = false) String userId);
}
