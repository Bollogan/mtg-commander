package com.mtg.deckbuilder.forum.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A comment on a {@link Post}. Author display name is denormalised at write time.
 *
 * <p>Moderation fields are additive (default {@link ModerationStatus#APPROVED}) so pre-existing
 * documents keep deserialising; only APPROVED comments are shown publicly (Phase 4).
 */
@Document(collection = "comments")
// Covers the public reply listing (postId+visible, oldest first) and the forum-scoped moderation
// queue (postId∈forum's topics + status) — see CommentService.list / ModerationQueueService (Phase 7).
@CompoundIndex(name = "comment_post_status_created",
    def = "{'postId': 1, 'moderationStatus': 1, 'createdAt': 1}")
public class Comment {

    @Id
    private String id;

    @Indexed
    private String postId;

    /** Id of the comment being replied to, or {@code null} for a top-level reply on the post. */
    private String parentCommentId;

    private UUID authorId;
    private String authorName;

    private String body;

    /** Denormalised vote tallies; the net score (upvotes − downvotes) drives ranking/display. */
    private long upvotes;
    private long downvotes;

    /** Moderation lifecycle; PENDING/REJECTED comments are held from public listings (Phase 4). */
    @Indexed
    private ModerationStatus moderationStatus = ModerationStatus.APPROVED;
    /** Signals raised by the auto-moderator or user reports — surfaced in the moderation queue. */
    private List<ModerationFlag> moderationFlags = new ArrayList<>();
    private String rejectionReason;

    @Indexed
    private Instant createdAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPostId() {
        return postId;
    }

    public void setPostId(String postId) {
        this.postId = postId;
    }

    public String getParentCommentId() {
        return parentCommentId;
    }

    public void setParentCommentId(String parentCommentId) {
        this.parentCommentId = parentCommentId;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public void setAuthorId(UUID authorId) {
        this.authorId = authorId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public long getUpvotes() {
        return upvotes;
    }

    public void setUpvotes(long upvotes) {
        this.upvotes = upvotes;
    }

    public long getDownvotes() {
        return downvotes;
    }

    public void setDownvotes(long downvotes) {
        this.downvotes = downvotes;
    }

    public ModerationStatus getModerationStatus() {
        return moderationStatus;
    }

    public void setModerationStatus(ModerationStatus moderationStatus) {
        this.moderationStatus = moderationStatus;
    }

    public List<ModerationFlag> getModerationFlags() {
        return moderationFlags;
    }

    public void setModerationFlags(List<ModerationFlag> moderationFlags) {
        this.moderationFlags = moderationFlags;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
