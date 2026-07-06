package com.mtg.deckbuilder.forum.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A forum board. Exposed through the {@code /api/forums} endpoints ("forum" in the API ==
 * {@code Thread} document). Its topics are {@link Post}s and their replies are {@code Comment}s,
 * forming the 3-tier forum model (board → thread → post). Rich metadata (category, tags, images,
 * privacy, moderation, activity score, roles/memberships) was added for the forum revamp; all new
 * fields are additive so pre-existing documents keep deserialising.
 */
@Document(collection = "threads")
// Discovery rails/search filter on approved+public then sort by activity or recency (Phase 7);
// these compound indexes cover ForumDiscoveryService's trending / rising / newest queries.
@CompoundIndexes({
    @CompoundIndex(name = "forum_public_activity",
        def = "{'moderationStatus': 1, 'isPrivate': 1, 'weeklyActivityScore': -1}"),
    @CompoundIndex(name = "forum_public_created",
        def = "{'moderationStatus': 1, 'isPrivate': 1, 'createdAt': -1}")
})
public class Thread {

    @Id
    private String id;

    private String title;
    private String description;
    /** {@link ForumCategory} name; kept as String for backward compatibility with old documents. */
    private String category;

    private String slug;
    private String coverImage;
    private String bannerImage;
    private String language;

    private List<String> tags = new ArrayList<>();

    private boolean nsfw;
    private boolean isPrivate;

    private ModerationStatus moderationStatus = ModerationStatus.APPROVED;
    private String rejectionReason;

    private UUID authorId;
    private String authorName;

    /** Number of topics (Posts) in this forum — a.k.a. the spec's totalThreads. */
    private long postCount;
    /** Number of replies (Comments) across the forum — the spec's totalPosts. */
    private long replyCount;
    private long memberCount;

    /** Recomputed rolling metric that drives Trending/Rising recommendations (see spec §2.2). */
    @Indexed
    private long weeklyActivityScore;

    /** Denormalised up/down vote tallies for the forum itself (net score = up - down). */
    private long upvotes;
    private long downvotes;

    private ForumSettings settings = ForumSettings.defaults();

    @Indexed
    private Instant lastActivityAt;

    private Instant createdAt;

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getCoverImage() {
        return coverImage;
    }

    public void setCoverImage(String coverImage) {
        this.coverImage = coverImage;
    }

    public String getBannerImage() {
        return bannerImage;
    }

    public void setBannerImage(String bannerImage) {
        this.bannerImage = bannerImage;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public boolean isNsfw() {
        return nsfw;
    }

    public void setNsfw(boolean nsfw) {
        this.nsfw = nsfw;
    }

    public boolean isPrivate() {
        return isPrivate;
    }

    public void setPrivate(boolean aPrivate) {
        isPrivate = aPrivate;
    }

    public ModerationStatus getModerationStatus() {
        return moderationStatus;
    }

    public void setModerationStatus(ModerationStatus moderationStatus) {
        this.moderationStatus = moderationStatus;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public long getReplyCount() {
        return replyCount;
    }

    public void setReplyCount(long replyCount) {
        this.replyCount = replyCount;
    }

    public long getMemberCount() {
        return memberCount;
    }

    public void setMemberCount(long memberCount) {
        this.memberCount = memberCount;
    }

    public long getWeeklyActivityScore() {
        return weeklyActivityScore;
    }

    public void setWeeklyActivityScore(long weeklyActivityScore) {
        this.weeklyActivityScore = weeklyActivityScore;
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

    public ForumSettings getSettings() {
        return settings;
    }

    public void setSettings(ForumSettings settings) {
        this.settings = settings;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
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

    public long getPostCount() {
        return postCount;
    }

    public void setPostCount(long postCount) {
        this.postCount = postCount;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public void setLastActivityAt(Instant lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
