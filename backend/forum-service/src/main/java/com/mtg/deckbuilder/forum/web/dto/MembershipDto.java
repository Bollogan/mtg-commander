package com.mtg.deckbuilder.forum.web.dto;

import com.mtg.deckbuilder.forum.domain.ForumMembership;
import java.time.Instant;
import java.util.UUID;

public record MembershipDto(
    String id,
    String forumId,
    UUID userId,
    String userName,
    String userAvatar,
    String roleId,
    Instant joinedAt,
    boolean banned,
    String banReason,
    Instant banExpiresAt) {

    public static MembershipDto from(ForumMembership m) {
        return new MembershipDto(m.getId(), m.getForumId(), m.getUserId(), m.getUserName(),
            m.getUserAvatar(), m.getRoleId(), m.getJoinedAt(), m.isBanned(), m.getBanReason(),
            m.getBanExpiresAt());
    }
}
