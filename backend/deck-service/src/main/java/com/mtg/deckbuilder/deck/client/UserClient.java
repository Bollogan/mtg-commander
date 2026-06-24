package com.mtg.deckbuilder.deck.client;

import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Reads profile data from user-service to enrich deck responses with the owner's
 * current display name/avatar. Resolved by Eureka service name.
 */
@FeignClient(name = "user-service", path = "/api/users")
public interface UserClient {

  @GetMapping("/{id}")
  UserSummary getUser(@PathVariable("id") UUID id);
}
