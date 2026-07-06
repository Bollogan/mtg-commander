package com.mtg.deckbuilder.forum.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AssignRoleRequest(@NotBlank String roleId) {
}
