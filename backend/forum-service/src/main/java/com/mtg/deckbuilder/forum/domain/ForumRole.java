package com.mtg.deckbuilder.forum.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A Discord-style role within a forum board ({@code forumId} points at a {@link Thread}).
 * {@code position} defines the hierarchy (higher = more senior). Every forum gets a default
 * member role (assigned on join) and an admin role (held by the creator).
 */
@Document(collection = "forum_roles")
public class ForumRole {

    @Id
    private String id;

    @Indexed
    private String forumId;

    private String name;
    private String color;
    private String icon;
    private int position;

    private ForumPermissions permissions = ForumPermissions.member();

    private boolean isDefault;
    private boolean admin;

    private Instant createdAt;

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public ForumPermissions getPermissions() {
        return permissions;
    }

    public void setPermissions(ForumPermissions permissions) {
        this.permissions = permissions;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public void setDefault(boolean aDefault) {
        isDefault = aDefault;
    }

    public boolean isAdmin() {
        return admin;
    }

    public void setAdmin(boolean admin) {
        this.admin = admin;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
