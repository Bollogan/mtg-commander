package com.mtg.deckbuilder.forum.web.dto;

import com.mtg.deckbuilder.forum.domain.Comment;
import com.mtg.deckbuilder.forum.domain.ModerationFlag;
import com.mtg.deckbuilder.forum.domain.Post;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * A single entry in a forum's moderation queue — a normalised view over a held {@link Post} (topic)
 * or {@link Comment} (reply), carrying the raised flags and the moderation status so a moderator can
 * act on it.
 */
public record ModerationItemDto(
    String id,
    String type,
    String forumId,
    String postId,
    String title,
    String excerpt,
    UUID authorId,
    String authorName,
    String moderationStatus,
    List<ModerationFlag> flags,
    String rejectionReason,
    Instant createdAt) {

    private static final int EXCERPT_LEN = 280;

    public static ModerationItemDto fromPost(Post p) {
        return new ModerationItemDto(
            p.getId(), "POST", p.getThreadId(), null, p.getTitle(), excerpt(p.getBody()),
            p.getAuthorId(), p.getAuthorName(),
            p.getModerationStatus() == null ? null : p.getModerationStatus().name(),
            p.getModerationFlags(), p.getRejectionReason(), p.getCreatedAt());
    }

    public static ModerationItemDto fromComment(Comment c, String forumId) {
        return new ModerationItemDto(
            c.getId(), "COMMENT", forumId, c.getPostId(), null, excerpt(c.getBody()),
            c.getAuthorId(), c.getAuthorName(),
            c.getModerationStatus() == null ? null : c.getModerationStatus().name(),
            c.getModerationFlags(), c.getRejectionReason(), c.getCreatedAt());
    }

    private static String excerpt(String body) {
        if (body == null) {
            return null;
        }
        return body.length() <= EXCERPT_LEN ? body : body.substring(0, EXCERPT_LEN) + "…";
    }
}
