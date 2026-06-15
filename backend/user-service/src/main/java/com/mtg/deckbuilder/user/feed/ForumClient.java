package com.mtg.deckbuilder.user.feed;

import java.util.List;
import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Reads recent posts from forum-service to assemble a follower feed. Resolved by Eureka
 * service name, never by hardcoded host.
 */
@FeignClient(name = "forum-service", path = "/api/posts")
public interface ForumClient {

    @GetMapping("/by-authors")
    List<FeedPostDto> postsByAuthors(@RequestParam("authorIds") List<UUID> authorIds,
                                     @RequestParam(value = "limit", defaultValue = "30") int limit);
}
