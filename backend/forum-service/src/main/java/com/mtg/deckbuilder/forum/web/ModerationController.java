package com.mtg.deckbuilder.forum.web;

import com.mtg.deckbuilder.forum.domain.ForumPermissions;
import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import com.mtg.deckbuilder.forum.service.MembershipService;
import com.mtg.deckbuilder.forum.service.ModerationQueueService;
import com.mtg.deckbuilder.forum.service.ModerationQueueService.ItemFilter;
import com.mtg.deckbuilder.forum.web.dto.ModerationActionRequest;
import com.mtg.deckbuilder.forum.web.dto.ModerationItemDto;
import com.mtg.deckbuilder.forum.web.dto.ModerationStatsDto;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The per-forum moderation dashboard (Phase 4): reviewing held content and approving / rejecting it
 * is gated on the {@code canModerate} permission, while reporting content is open to any member.
 */
@RestController
@RequestMapping("/api/forums/{id}/moderation")
public class ModerationController {

    private final ModerationQueueService moderation;
    private final MembershipService membershipService;

    public ModerationController(ModerationQueueService moderation, MembershipService membershipService) {
        this.moderation = moderation;
        this.membershipService = membershipService;
    }

    @GetMapping("/queue")
    public List<ModerationItemDto> queue(@PathVariable String id,
                                         @RequestHeader("X-User-Id") UUID userId,
                                         @RequestParam(defaultValue = "PENDING") String status,
                                         @RequestParam(defaultValue = "ALL") String type,
                                         @RequestParam(defaultValue = "50") int limit) {
        requireModerator(id, userId);
        return moderation.queue(id, parseStatus(status), parseFilter(type), clamp(limit));
    }

    @GetMapping("/stats")
    public ModerationStatsDto stats(@PathVariable String id, @RequestHeader("X-User-Id") UUID userId) {
        requireModerator(id, userId);
        return moderation.stats(id);
    }

    // ── Post actions ────────────────────────────────────────────────────────

    @PostMapping("/posts/{postId}/approve")
    public ModerationItemDto approvePost(@PathVariable String id, @PathVariable String postId,
                                         @RequestHeader("X-User-Id") UUID userId) {
        requireModerator(id, userId);
        return moderation.approvePost(id, postId, userId);
    }

    @PostMapping("/posts/{postId}/reject")
    public ModerationItemDto rejectPost(@PathVariable String id, @PathVariable String postId,
                                        @RequestHeader("X-User-Id") UUID userId,
                                        @RequestBody(required = false) ModerationActionRequest req) {
        requireModerator(id, userId);
        return moderation.rejectPost(id, postId, userId, reason(req));
    }

    @PostMapping("/posts/{postId}/report")
    public ModerationItemDto reportPost(@PathVariable String id, @PathVariable String postId,
                                        @RequestHeader("X-User-Id") UUID userId,
                                        @RequestBody(required = false) ModerationActionRequest req) {
        return moderation.reportPost(id, postId, userId, reason(req));
    }

    // ── Comment actions ───────────────────────────────────────────────────────

    @PostMapping("/comments/{commentId}/approve")
    public ModerationItemDto approveComment(@PathVariable String id, @PathVariable String commentId,
                                            @RequestHeader("X-User-Id") UUID userId) {
        requireModerator(id, userId);
        return moderation.approveComment(id, commentId, userId);
    }

    @PostMapping("/comments/{commentId}/reject")
    public ModerationItemDto rejectComment(@PathVariable String id, @PathVariable String commentId,
                                           @RequestHeader("X-User-Id") UUID userId,
                                           @RequestBody(required = false) ModerationActionRequest req) {
        requireModerator(id, userId);
        return moderation.rejectComment(id, commentId, userId, reason(req));
    }

    @PostMapping("/comments/{commentId}/report")
    public ModerationItemDto reportComment(@PathVariable String id, @PathVariable String commentId,
                                           @RequestHeader("X-User-Id") UUID userId,
                                           @RequestBody(required = false) ModerationActionRequest req) {
        return moderation.reportComment(id, commentId, userId, reason(req));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private void requireModerator(String forumId, UUID userId) {
        ForumPermissions perms = membershipService.resolvePermissions(forumId, userId);
        if (perms == null) {
            throw new ForbiddenException("You are not a member of this forum");
        }
        if (!perms.isCanModerate()) {
            throw new ForbiddenException("You lack the moderation permission");
        }
    }

    private static String reason(ModerationActionRequest req) {
        return req == null ? null : req.reason();
    }

    private static ModerationStatus parseStatus(String raw) {
        try {
            return ModerationStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            return ModerationStatus.PENDING;
        }
    }

    private static ItemFilter parseFilter(String raw) {
        try {
            return ItemFilter.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            return ItemFilter.ALL;
        }
    }

    private static int clamp(int limit) {
        return Math.max(1, Math.min(limit, 100));
    }
}
