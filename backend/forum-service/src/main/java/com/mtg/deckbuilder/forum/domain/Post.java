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
 * A post within a {@link Thread}. {@code authorName}/{@code authorAvatar} are denormalised
 * at write time (enriched from user-service via Feign) to keep reads free of N+1 lookups.
 *
 * <p>Moderation fields are additive (default {@link ModerationStatus#APPROVED}) so pre-existing
 * documents keep deserialising; only APPROVED posts are shown publicly (Phase 4).
 */
@Document(collection = "posts")
// Covers the hot paths: public listing (threadId+visible, newest first) and the moderation queue
// (threadId+status, newest first) — see PostService.listByThread / ModerationQueueService (Phase 7).
@CompoundIndex(name = "post_forum_status_created",
    def = "{'threadId': 1, 'moderationStatus': 1, 'createdAt': -1}")
public class Post {

    @Id
    private String id;

    @Indexed
    private String threadId;

    @Indexed
    private UUID authorId;

    private String authorName;
    private String authorAvatar;

    private String title;
    private String body;

    private long commentCount;

    /** Denormalised vote tallies; the net score (upvotes − downvotes) drives ranking/display. */
    private long upvotes;
    private long downvotes;

    /** Moderation lifecycle; PENDING/REJECTED posts are held from public listings (Phase 4). */
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

    public String getThreadId() {
        return threadId;
    }

    public void setThreadId(String threadId) {
        this.threadId = threadId;
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

    public String getAuthorAvatar() {
        return authorAvatar;
    }

    public void setAuthorAvatar(String authorAvatar) {
        this.authorAvatar = authorAvatar;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public long getCommentCount() {
        return commentCount;
    }

    public void setCommentCount(long commentCount) {
        this.commentCount = commentCount;
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
