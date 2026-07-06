package com.mtg.deckbuilder.forum.web.dto;

import com.mtg.deckbuilder.forum.domain.Thread;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ThreadDto(
    String id,
    String title,
    String description,
    String category,
    String slug,
    String coverImage,
    String bannerImage,
    String language,
    List<String> tags,
    boolean nsfw,
    boolean isPrivate,
    String moderationStatus,
    UUID authorId,
    String authorName,
    long postCount,
    long replyCount,
    long memberCount,
    long weeklyActivityScore,
    long upvotes,
    long downvotes,
    long score,
    int myVote,
    Instant lastActivityAt,
    Instant createdAt) {

    public static ThreadDto from(Thread t) {
        return from(t, 0);
    }

    public static ThreadDto from(Thread t, int myVote) {
        return new ThreadDto(
            t.getId(), t.getTitle(), t.getDescription(), t.getCategory(), t.getSlug(),
            t.getCoverImage(), t.getBannerImage(), t.getLanguage(), t.getTags(),
            t.isNsfw(), t.isPrivate(),
            t.getModerationStatus() == null ? null : t.getModerationStatus().name(),
            t.getAuthorId(), t.getAuthorName(), t.getPostCount(), t.getReplyCount(),
            t.getMemberCount(), t.getWeeklyActivityScore(),
            t.getUpvotes(), t.getDownvotes(), t.getUpvotes() - t.getDownvotes(), myVote,
            t.getLastActivityAt(), t.getCreatedAt());
    }
}
