package com.mtg.deckbuilder.user.web;

import com.mtg.deckbuilder.user.domain.Profile;
import com.mtg.deckbuilder.user.service.FollowService;
import com.mtg.deckbuilder.user.web.dto.FollowStatusDto;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class FollowController {

    private final FollowService followService;

    public FollowController(FollowService followService) {
        this.followService = followService;
    }

    /** The authenticated caller (X-User-Id) follows {id}. */
    @PostMapping("/{id}/follow")
    public FollowStatusDto follow(@PathVariable UUID id, @RequestHeader("X-User-Id") UUID userId) {
        Profile target = followService.follow(userId, id);
        return new FollowStatusDto(userId, id, true, target.getFollowerCount());
    }

    @DeleteMapping("/{id}/follow")
    public FollowStatusDto unfollow(@PathVariable UUID id, @RequestHeader("X-User-Id") UUID userId) {
        Profile target = followService.unfollow(userId, id);
        return new FollowStatusDto(userId, id, false, target.getFollowerCount());
    }

    @GetMapping("/{id}/follow")
    public FollowStatusDto status(@PathVariable UUID id, @RequestHeader("X-User-Id") UUID userId) {
        boolean following = followService.isFollowing(userId, id);
        return new FollowStatusDto(userId, id, following, 0);
    }

    /** Follower ids of {id}. Used by forum-service to fan out post notifications. */
    @GetMapping("/{id}/followers")
    public List<UUID> followers(@PathVariable UUID id) {
        return followService.followerIds(id);
    }

    /** Ids that {id} follows. */
    @GetMapping("/{id}/following")
    public List<UUID> following(@PathVariable UUID id) {
        return followService.followingIds(id);
    }
}
