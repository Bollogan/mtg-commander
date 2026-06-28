package com.mtg.deckbuilder.user.web;

import com.mtg.deckbuilder.user.feed.FeedPostDto;
import com.mtg.deckbuilder.user.feed.ForumClient;
import com.mtg.deckbuilder.user.service.FollowService;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Assembles a user's social feed: recent posts authored by the people they follow,
 * fetched from forum-service via Feign. Degrades gracefully to an empty feed if
 * forum-service is unavailable.
 */
@RestController
@RequestMapping("/api/users")
public class FeedController {

    private static final Logger log = LoggerFactory.getLogger(FeedController.class);

    private final FollowService followService;
    private final ForumClient forumClient;

    public FeedController(FollowService followService, ForumClient forumClient) {
        this.followService = followService;
        this.forumClient = forumClient;
    }

    @GetMapping("/{id}/feed")
    public List<FeedPostDto> feed(@PathVariable UUID id,
                                  @RequestParam(defaultValue = "30") int limit) {
        List<UUID> following = followService.followingIds(id);
        if (following.isEmpty()) {
            return List.of();
        }
        try {
            return forumClient.postsByAuthors(following, limit);
        } catch (Exception e) {
            log.warn("forum-service unavailable for feed of {}: {}", id, e.getMessage());
            return List.of();
        }
    }
}
