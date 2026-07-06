package com.mtg.deckbuilder.forum.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.mtg.deckbuilder.forum.domain.ForumMembership;
import com.mtg.deckbuilder.forum.domain.ForumPermissions;
import com.mtg.deckbuilder.forum.domain.ForumRole;
import com.mtg.deckbuilder.forum.repo.ForumMembershipRepository;
import com.mtg.deckbuilder.forum.repo.ForumRoleRepository;
import com.mtg.deckbuilder.forum.web.ForbiddenException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MembershipServiceTest {

    private final ForumMembershipRepository memberships = mock(ForumMembershipRepository.class);
    private final ForumRoleRepository roles = mock(ForumRoleRepository.class);
    private final MembershipService service = new MembershipService(memberships, roles);

    private final String forum = "f1";
    private final UUID user = UUID.randomUUID();

    private ForumMembership membership(String roleId, boolean banned, Instant banExpiry) {
        ForumMembership m = new ForumMembership();
        m.setForumId(forum);
        m.setUserId(user);
        m.setRoleId(roleId);
        m.setBanned(banned);
        m.setBanExpiresAt(banExpiry);
        return m;
    }

    @Test
    void nonMemberHasNullPermissions() {
        when(memberships.findByForumIdAndUserId(forum, user)).thenReturn(Optional.empty());
        assertThat(service.resolvePermissions(forum, user)).isNull();
    }

    @Test
    void memberInheritsRolePermissions() {
        when(memberships.findByForumIdAndUserId(forum, user))
            .thenReturn(Optional.of(membership("role1", false, null)));
        ForumRole role = new ForumRole();
        role.setPermissions(ForumPermissions.admin());
        when(roles.findById("role1")).thenReturn(Optional.of(role));

        ForumPermissions perms = service.resolvePermissions(forum, user);

        assertThat(perms.isCanManageRoles()).isTrue();
        assertThat(perms.isCanBanUsers()).isTrue();
    }

    @Test
    void activelyBannedMemberIsLockedDown() {
        when(memberships.findByForumIdAndUserId(forum, user))
            .thenReturn(Optional.of(membership("role1", true, Instant.now().plusSeconds(3600))));

        ForumPermissions perms = service.resolvePermissions(forum, user);

        assertThat(perms.isCanPost()).isFalse();
        assertThat(perms.isCanCreateThread()).isFalse();
    }

    @Test
    void expiredBanNoLongerRestricts() {
        when(memberships.findByForumIdAndUserId(forum, user))
            .thenReturn(Optional.of(membership(null, true, Instant.now().minusSeconds(3600))));

        ForumPermissions perms = service.resolvePermissions(forum, user);

        assertThat(perms.isCanPost()).isTrue(); // ban lapsed → default member perms
    }

    @Test
    void banForSevenDaysSetsFutureExpiry() {
        when(memberships.findByForumIdAndUserId(forum, user))
            .thenReturn(Optional.of(membership("role1", false, null)));
        when(memberships.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ForumMembership banned = service.ban(forum, user, "spam", "7d");

        assertThat(banned.isBanned()).isTrue();
        assertThat(banned.getBanExpiresAt()).isAfter(Instant.now().plusSeconds(6 * 24 * 3600));
    }

    @Test
    void permanentBanHasNoExpiry() {
        when(memberships.findByForumIdAndUserId(forum, user))
            .thenReturn(Optional.of(membership("role1", false, null)));
        when(memberships.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ForumMembership banned = service.ban(forum, user, "abuse", "permanent");

        assertThat(banned.isBanned()).isTrue();
        assertThat(banned.getBanExpiresAt()).isNull();
    }

    @Test
    void bannedUserCannotRejoin() {
        when(memberships.findByForumIdAndUserId(forum, user))
            .thenReturn(Optional.of(membership("role1", true, null)));

        assertThatThrownBy(() -> service.join(forum, user, "Bob", null))
            .isInstanceOf(ForbiddenException.class);
    }
}
