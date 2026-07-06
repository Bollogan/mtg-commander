package com.mtg.deckbuilder.forum.web.dto;

/**
 * Aggregate counts backing the moderation dashboard's status tabs: how many topics/replies sit in
 * each {@link com.mtg.deckbuilder.forum.domain.ModerationStatus} for a forum.
 */
public record ModerationStatsDto(
    long pendingPosts,
    long pendingComments,
    long pending,
    long approvedPosts,
    long approvedComments,
    long rejectedPosts,
    long rejectedComments) {

    public static ModerationStatsDto of(long pendingPosts, long pendingComments,
                                        long approvedPosts, long approvedComments,
                                        long rejectedPosts, long rejectedComments) {
        return new ModerationStatsDto(
            pendingPosts, pendingComments, pendingPosts + pendingComments,
            approvedPosts, approvedComments, rejectedPosts, rejectedComments);
    }
}
