package com.mtg.deckbuilder.forum.client;

import java.util.List;
import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Reads profile data from user-service to enrich posts/comments and to fan out
 * notifications to an author's followers. Resolved by Eureka service name.
 */
@FeignClient(name = "user-service", path = "/api/users")
public interface UserClient {

    @GetMapping("/{id}")
    UserSummary getUser(@PathVariable("id") UUID id);

    @GetMapping("/{id}/followers")
    List<UUID> followers(@PathVariable("id") UUID id);
}
