package com.mtg.deckbuilder.forum.web.dto;

import com.mtg.deckbuilder.forum.domain.ForumPermissions;
import jakarta.validation.constraints.Size;

/** Partial update: any {@code null} field is left unchanged. */
public record UpdateRoleRequest(
    @Size(max = 40) String name,
    @Size(max = 9) String color,
    @Size(max = 8) String icon,
    Integer position,
    ForumPermissions permissions) {
}
