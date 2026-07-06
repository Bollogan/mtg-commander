package com.mtg.deckbuilder.forum.web.dto;

import com.mtg.deckbuilder.forum.domain.ForumPermissions;
import com.mtg.deckbuilder.forum.domain.ForumRole;
import java.time.Instant;

public record RoleDto(
    String id,
    String forumId,
    String name,
    String color,
    String icon,
    int position,
    ForumPermissions permissions,
    boolean isDefault,
    boolean admin,
    Instant createdAt) {

    public static RoleDto from(ForumRole r) {
        return new RoleDto(r.getId(), r.getForumId(), r.getName(), r.getColor(), r.getIcon(),
            r.getPosition(), r.getPermissions(), r.isDefault(), r.isAdmin(), r.getCreatedAt());
    }
}
