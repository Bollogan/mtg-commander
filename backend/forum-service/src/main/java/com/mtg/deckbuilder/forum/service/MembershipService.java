package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.domain.ForumMembership;
import com.mtg.deckbuilder.forum.domain.ForumPermissions;
import com.mtg.deckbuilder.forum.domain.ForumRole;
import com.mtg.deckbuilder.forum.repo.ForumMembershipRepository;
import com.mtg.deckbuilder.forum.repo.ForumRoleRepository;
import com.mtg.deckbuilder.forum.web.NotFoundException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * Manages {@link ForumMembership}s: joining, leaving/kicking, banning and role assignment, plus
 * resolving a user's effective {@link ForumPermissions} in a forum (from their role).
 */
@Service
public class MembershipService {

    private final ForumMembershipRepository membershipRepository;
    private final ForumRoleRepository roleRepository;

    public MembershipService(ForumMembershipRepository membershipRepository,
                             ForumRoleRepository roleRepository) {
        this.membershipRepository = membershipRepository;
        this.roleRepository = roleRepository;
    }

    /** Idempotently adds a user to a forum with the given role; returns the membership. */
    public ForumMembership addMember(String forumId, UUID userId, String userName, String avatar,
                                     String roleId) {
        Optional<ForumMembership> existing = membershipRepository.findByForumIdAndUserId(forumId, userId);
        if (existing.isPresent()) {
            return existing.get();
        }
        ForumMembership m = new ForumMembership();
        m.setForumId(forumId);
        m.setUserId(userId);
        m.setUserName(userName);
        m.setUserAvatar(avatar);
        m.setRoleId(roleId);
        m.setJoinedAt(Instant.now());
        return membershipRepository.save(m);
    }

    /** Self-join using the forum's default role. Rejected if the user is banned. */
    public ForumMembership join(String forumId, UUID userId, String userName, String avatar) {
        Optional<ForumMembership> existing = membershipRepository.findByForumIdAndUserId(forumId, userId);
        if (existing.isPresent()) {
            ForumMembership m = existing.get();
            if (isActivelyBanned(m)) {
                throw new com.mtg.deckbuilder.forum.web.ForbiddenException("You are banned from this forum");
            }
            return m;
        }
        ForumRole def = roleRepository.findFirstByForumIdAndIsDefaultTrue(forumId);
        return addMember(forumId, userId, userName, avatar, def == null ? null : def.getId());
    }

    public List<ForumMembership> list(String forumId, int limit) {
        return membershipRepository.findByForumIdOrderByJoinedAtDesc(forumId, PageRequest.of(0, limit));
    }

    public ForumMembership require(String forumId, UUID userId) {
        return membershipRepository.findByForumIdAndUserId(forumId, userId)
            .orElseThrow(() -> new NotFoundException("Membership not found"));
    }

    /** Removes a member (leave or kick). */
    public void remove(String forumId, UUID userId) {
        membershipRepository.findByForumIdAndUserId(forumId, userId)
            .ifPresent(membershipRepository::delete);
    }

    public ForumMembership assignRole(String forumId, UUID userId, String roleId) {
        ForumRole role = roleRepository.findById(roleId)
            .orElseThrow(() -> new NotFoundException("Role not found: " + roleId));
        if (!role.getForumId().equals(forumId)) {
            throw new NotFoundException("Role does not belong to this forum");
        }
        ForumMembership m = require(forumId, userId);
        m.setRoleId(roleId);
        return membershipRepository.save(m);
    }

    /** Bans a member for a fixed window ({@code 1d|7d|30d}) or permanently ({@code permanent}/null). */
    public ForumMembership ban(String forumId, UUID userId, String reason, String duration) {
        ForumMembership m = require(forumId, userId);
        m.setBanned(true);
        m.setBanReason(reason);
        m.setBanExpiresAt(banExpiry(duration));
        return membershipRepository.save(m);
    }

    public ForumMembership unban(String forumId, UUID userId) {
        ForumMembership m = require(forumId, userId);
        m.setBanned(false);
        m.setBanReason(null);
        m.setBanExpiresAt(null);
        return membershipRepository.save(m);
    }

    public boolean isMember(String forumId, UUID userId) {
        return membershipRepository.existsByForumIdAndUserId(forumId, userId);
    }

    public long memberCount(String forumId) {
        return membershipRepository.countByForumId(forumId);
    }

    /**
     * A user's effective permissions in a forum, from their role. Returns {@code null} when the
     * user is not a member; an actively-banned member gets a locked-down, view-only set.
     */
    public ForumPermissions resolvePermissions(String forumId, UUID userId) {
        Optional<ForumMembership> membership = membershipRepository.findByForumIdAndUserId(forumId, userId);
        if (membership.isEmpty()) {
            return null;
        }
        if (isActivelyBanned(membership.get())) {
            return banned();
        }
        String roleId = membership.get().getRoleId();
        if (roleId == null) {
            return ForumPermissions.member();
        }
        return roleRepository.findById(roleId)
            .map(ForumRole::getPermissions)
            .orElseGet(ForumPermissions::member);
    }

    static boolean isActivelyBanned(ForumMembership m) {
        if (!m.isBanned()) {
            return false;
        }
        Instant expiry = m.getBanExpiresAt();
        return expiry == null || expiry.isAfter(Instant.now());
    }

    private static Instant banExpiry(String duration) {
        if (duration == null || duration.isBlank() || duration.equalsIgnoreCase("permanent")) {
            return null;
        }
        return switch (duration.toLowerCase()) {
            case "1d" -> Instant.now().plus(Duration.ofDays(1));
            case "7d" -> Instant.now().plus(Duration.ofDays(7));
            case "30d" -> Instant.now().plus(Duration.ofDays(30));
            default -> null;
        };
    }

    private static ForumPermissions banned() {
        ForumPermissions p = new ForumPermissions();
        p.setCanPost(false);
        p.setCanCreateThread(false);
        p.setCanEditOwnContent(false);
        p.setCanInviteUsers(false);
        return p;
    }
}
