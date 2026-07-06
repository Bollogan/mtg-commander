package com.mtg.deckbuilder.forum.domain;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A user's membership of a forum board, carrying their assigned {@link ForumRole} and ban state.
 * The (forumId, userId) pair is unique so a user joins a forum at most once.
 */
@Document(collection = "forum_memberships")
@CompoundIndex(name = "forum_user_unique", def = "{'forumId': 1, 'userId': 1}", unique = true)
public class ForumMembership {

    @Id
    private String id;

    @Indexed
    private String forumId;

    @Indexed
    private UUID userId;

    private String userName;
    private String userAvatar;

    private String roleId;

    private Instant joinedAt;

    private boolean banned;
    private String banReason;
    private Instant banExpiresAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getForumId() {
        return forumId;
    }

    public void setForumId(String forumId) {
        this.forumId = forumId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserAvatar() {
        return userAvatar;
    }

    public void setUserAvatar(String userAvatar) {
        this.userAvatar = userAvatar;
    }

    public String getRoleId() {
        return roleId;
    }

    public void setRoleId(String roleId) {
        this.roleId = roleId;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(Instant joinedAt) {
        this.joinedAt = joinedAt;
    }

    public boolean isBanned() {
        return banned;
    }

    public void setBanned(boolean banned) {
        this.banned = banned;
    }

    public String getBanReason() {
        return banReason;
    }

    public void setBanReason(String banReason) {
        this.banReason = banReason;
    }

    public Instant getBanExpiresAt() {
        return banExpiresAt;
    }

    public void setBanExpiresAt(Instant banExpiresAt) {
        this.banExpiresAt = banExpiresAt;
    }
}
