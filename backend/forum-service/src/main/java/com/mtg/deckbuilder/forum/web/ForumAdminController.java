package com.mtg.deckbuilder.forum.web;

import com.mtg.deckbuilder.forum.domain.ForumMembership;
import com.mtg.deckbuilder.forum.domain.ForumPermissions;
import com.mtg.deckbuilder.forum.event.ForumEvent;
import com.mtg.deckbuilder.forum.event.ForumEventPublisher;
import com.mtg.deckbuilder.forum.service.ForumService;
import com.mtg.deckbuilder.forum.service.MembershipService;
import com.mtg.deckbuilder.forum.service.RoleService;
import com.mtg.deckbuilder.forum.web.dto.AssignRoleRequest;
import com.mtg.deckbuilder.forum.web.dto.BanRequest;
import com.mtg.deckbuilder.forum.web.dto.CreateRoleRequest;
import com.mtg.deckbuilder.forum.web.dto.MembershipDto;
import com.mtg.deckbuilder.forum.web.dto.RoleDto;
import com.mtg.deckbuilder.forum.web.dto.UpdateRoleRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.util.function.Predicate;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Roles, permissions and membership management for a forum board (Phase 2). Mutating actions are
 * gated on the requester's effective {@link ForumPermissions}, resolved from their role.
 */
@RestController
@RequestMapping("/api/forums/{id}")
public class ForumAdminController {

    private final ForumService forumService;
    private final RoleService roleService;
    private final MembershipService membershipService;
    private final ForumEventPublisher events;

    public ForumAdminController(ForumService forumService, RoleService roleService,
                                MembershipService membershipService, ForumEventPublisher events) {
        this.forumService = forumService;
        this.roleService = roleService;
        this.membershipService = membershipService;
        this.events = events;
    }

    // ── Roles ────────────────────────────────────────────────────────────────

    @GetMapping("/roles")
    public List<RoleDto> roles(@PathVariable String id) {
        return roleService.listForForum(id).stream().map(RoleDto::from).toList();
    }

    @PostMapping("/roles")
    @ResponseStatus(HttpStatus.CREATED)
    public RoleDto createRole(@PathVariable String id,
                              @RequestHeader("X-User-Id") UUID userId,
                              @Valid @RequestBody CreateRoleRequest req) {
        require(id, userId, ForumPermissions::isCanManageRoles);
        return RoleDto.from(roleService.create(id, req.name(), req.color(), req.icon(), req.permissions()));
    }

    @PatchMapping("/roles/{roleId}")
    public RoleDto updateRole(@PathVariable String id, @PathVariable String roleId,
                              @RequestHeader("X-User-Id") UUID userId,
                              @Valid @RequestBody UpdateRoleRequest req) {
        require(id, userId, ForumPermissions::isCanManageRoles);
        return RoleDto.from(roleService.update(id, roleId, req.name(), req.color(), req.icon(),
            req.position(), req.permissions()));
    }

    @DeleteMapping("/roles/{roleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRole(@PathVariable String id, @PathVariable String roleId,
                           @RequestHeader("X-User-Id") UUID userId) {
        require(id, userId, ForumPermissions::isCanManageRoles);
        roleService.delete(id, roleId);
    }

    // ── Members ──────────────────────────────────────────────────────────────

    @GetMapping("/members")
    public List<MembershipDto> members(@PathVariable String id,
                                       @RequestParam(defaultValue = "50") int limit) {
        return membershipService.list(id, Math.max(1, Math.min(limit, 100))).stream()
            .map(MembershipDto::from).toList();
    }

    @GetMapping("/me/permissions")
    public ForumPermissions myPermissions(@PathVariable String id,
                                          @RequestHeader("X-User-Id") UUID userId) {
        ForumPermissions p = membershipService.resolvePermissions(id, userId);
        return p == null ? new NonMember() : p;
    }

    @PostMapping("/members")
    @ResponseStatus(HttpStatus.CREATED)
    public MembershipDto join(@PathVariable String id,
                              @RequestHeader("X-User-Id") UUID userId,
                              @RequestHeader(value = "X-User-Name", required = false) String userName) {
        forumService.get(id); // 404 if the forum doesn't exist
        ForumMembership m = membershipService.join(id, userId, userName, null);
        forumService.refreshMemberCount(id);
        events.publish(ForumEvent.of("MEMBER_JOINED", id).withActor(userId, userName));
        return MembershipDto.from(m);
    }

    @DeleteMapping("/members/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable String id, @PathVariable UUID memberId,
                             @RequestHeader("X-User-Id") UUID userId) {
        // Leaving yourself is always allowed; removing someone else needs ban rights.
        if (!memberId.equals(userId)) {
            require(id, userId, ForumPermissions::isCanBanUsers);
        }
        membershipService.remove(id, memberId);
        forumService.refreshMemberCount(id);
        events.publish(ForumEvent.of("MEMBER_LEFT", id).withActor(memberId, null));
    }

    @PatchMapping("/members/{memberId}/role")
    public MembershipDto assignRole(@PathVariable String id, @PathVariable UUID memberId,
                                    @RequestHeader("X-User-Id") UUID userId,
                                    @Valid @RequestBody AssignRoleRequest req) {
        require(id, userId, ForumPermissions::isCanManageRoles);
        return MembershipDto.from(membershipService.assignRole(id, memberId, req.roleId()));
    }

    @PostMapping("/members/{memberId}/ban")
    public MembershipDto ban(@PathVariable String id, @PathVariable UUID memberId,
                             @RequestHeader("X-User-Id") UUID userId,
                             @Valid @RequestBody BanRequest req) {
        require(id, userId, ForumPermissions::isCanBanUsers);
        return MembershipDto.from(membershipService.ban(id, memberId, req.reason(), req.duration()));
    }

    @DeleteMapping("/members/{memberId}/ban")
    public MembershipDto unban(@PathVariable String id, @PathVariable UUID memberId,
                               @RequestHeader("X-User-Id") UUID userId) {
        require(id, userId, ForumPermissions::isCanBanUsers);
        return MembershipDto.from(membershipService.unban(id, memberId));
    }

    /** Loads the requester's permissions and enforces {@code check}, else 403. */
    private void require(String forumId, UUID userId, Predicate<ForumPermissions> check) {
        ForumPermissions perms = membershipService.resolvePermissions(forumId, userId);
        if (perms == null) {
            throw new ForbiddenException("You are not a member of this forum");
        }
        if (!check.test(perms)) {
            throw new ForbiddenException("You lack the required permission");
        }
    }

    /** Zeroed permission set returned for non-members querying their own permissions. */
    private static final class NonMember extends ForumPermissions {
        private NonMember() {
            setCanView(false);
            setCanPost(false);
            setCanCreateThread(false);
            setCanEditOwnContent(false);
            setCanDeleteOwnContent(false);
            setCanInviteUsers(false);
        }
    }
}
