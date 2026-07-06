package com.mtg.deckbuilder.forum.web.dto;

import com.mtg.deckbuilder.forum.domain.ForumPermissions;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRoleRequest(
    @NotBlank @Size(max = 40) String name,
    @Size(max = 9) String color,
    @Size(max = 8) String icon,
    ForumPermissions permissions) {
}
