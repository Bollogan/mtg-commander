package com.mtg.deckbuilder.user.web.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(min = 1, max = 60) String displayName,
    @Size(max = 500) String bio,
    @Size(max = 300) String avatarUrl,
    @Size(max = 60) String country) {
}
