package com.mtg.deckbuilder.user.web.dto;

import com.mtg.deckbuilder.user.domain.Profile;
import java.time.Instant;
import java.util.UUID;

public record ProfileDto(
    UUID id,
    String displayName,
    String bio,
    String avatarUrl,
    String country,
    long followerCount,
    long followingCount,
    long deckCount,
    Instant createdAt) {

    public static ProfileDto from(Profile p) {
        return new ProfileDto(
            p.getId(),
            p.getDisplayName(),
            p.getBio(),
            p.getAvatarUrl(),
            p.getCountry(),
            p.getFollowerCount(),
            p.getFollowingCount(),
            p.getDeckCount(),
            p.getCreatedAt());
    }
}
