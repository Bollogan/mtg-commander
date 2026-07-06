package com.mtg.deckbuilder.forum.moderation;

import com.mtg.deckbuilder.forum.domain.ModerationFlag;
import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import java.util.List;

/**
 * The verdict of the {@link ModerationService} for a piece of content: the chosen
 * {@link ModerationAction}, the aggregate confidence, the raised {@link ModerationFlag}s and a
 * human-readable reason (populated when blocked/held).
 */
public record ModerationResult(
    ModerationAction action,
    double confidence,
    List<ModerationFlag> flags,
    String reason) {

    public boolean isBlocked() {
        return action == ModerationAction.BLOCK;
    }

    public boolean needsReview() {
        return action == ModerationAction.PENDING_REVIEW;
    }

    /** Maps the action onto the persisted {@link ModerationStatus} of the created content. */
    public ModerationStatus toStatus() {
        return switch (action) {
            case ALLOW -> ModerationStatus.APPROVED;
            case PENDING_REVIEW -> ModerationStatus.PENDING;
            case BLOCK -> ModerationStatus.REJECTED;
        };
    }

    public static ModerationResult allow() {
        return new ModerationResult(ModerationAction.ALLOW, 0.0, List.of(), null);
    }
}
