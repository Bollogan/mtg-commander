package com.mtg.deckbuilder.user.web.dto;

import java.util.UUID;

public record FollowStatusDto(UUID followerId, UUID followingId, boolean following, long followerCount) {
}
