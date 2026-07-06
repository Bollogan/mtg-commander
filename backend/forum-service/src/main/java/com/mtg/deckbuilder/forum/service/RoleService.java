package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.domain.ForumPermissions;
import com.mtg.deckbuilder.forum.domain.ForumRole;
import com.mtg.deckbuilder.forum.repo.ForumRoleRepository;
import com.mtg.deckbuilder.forum.web.ForbiddenException;
import com.mtg.deckbuilder.forum.web.NotFoundException;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Manages the Discord-style {@link ForumRole}s of a forum: default provisioning on creation plus
 * full CRUD and permission editing (Phase 2). The admin and default roles are protected.
 */
@Service
public class RoleService {

    private final ForumRoleRepository roleRepository;

    public RoleService(ForumRoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    /** Identifiers of the two roles the creation flow needs to wire up the creator + new joiners. */
    public record DefaultRoles(String adminRoleId, String memberRoleId) {
    }

    /** Creates Admin / Moderator / Member for a fresh forum and returns the admin + default ids. */
    public DefaultRoles provisionDefaults(String forumId) {
        ForumRole admin = save(forumId, "Admin", "#FFD700", "👑", 2, ForumPermissions.admin(), false, true);
        save(forumId, "Moderator", "#4169E1", "🛡️", 1, ForumPermissions.moderator(), false, false);
        ForumRole member = save(forumId, "Member", "#808080", "👤", 0, ForumPermissions.member(), true, false);
        return new DefaultRoles(admin.getId(), member.getId());
    }

    public List<ForumRole> listForForum(String forumId) {
        return roleRepository.findByForumIdOrderByPositionDesc(forumId);
    }

    public ForumRole get(String roleId) {
        return roleRepository.findById(roleId)
            .orElseThrow(() -> new NotFoundException("Role not found: " + roleId));
    }

    /** Creates a custom role, positioned just below the top existing role. */
    public ForumRole create(String forumId, String name, String color, String icon,
                            ForumPermissions permissions) {
        List<ForumRole> existing = roleRepository.findByForumIdOrderByPositionDesc(forumId);
        int topPosition = existing.isEmpty() ? 0 : existing.get(0).getPosition();
        return save(forumId, name, color, icon, Math.max(1, topPosition),
            permissions == null ? ForumPermissions.member() : permissions, false, false);
    }

    public ForumRole update(String forumId, String roleId, String name, String color, String icon,
                            Integer position, ForumPermissions permissions) {
        ForumRole role = get(roleId);
        assertBelongs(role, forumId);
        if (name != null) {
            role.setName(name);
        }
        if (color != null) {
            role.setColor(color);
        }
        if (icon != null) {
            role.setIcon(icon);
        }
        if (position != null) {
            role.setPosition(position);
        }
        if (permissions != null) {
            // The admin role always keeps full control — its permission set can't be nerfed.
            role.setPermissions(role.isAdmin() ? ForumPermissions.admin() : permissions);
        }
        return roleRepository.save(role);
    }

    public void delete(String forumId, String roleId) {
        ForumRole role = get(roleId);
        assertBelongs(role, forumId);
        if (role.isAdmin() || role.isDefault()) {
            throw new ForbiddenException("The admin and default roles cannot be deleted");
        }
        roleRepository.delete(role);
    }

    private void assertBelongs(ForumRole role, String forumId) {
        if (!role.getForumId().equals(forumId)) {
            throw new NotFoundException("Role does not belong to this forum");
        }
    }

    private ForumRole save(String forumId, String name, String color, String icon, int position,
                           ForumPermissions permissions, boolean isDefault, boolean admin) {
        ForumRole r = new ForumRole();
        r.setForumId(forumId);
        r.setName(name);
        r.setColor(color);
        r.setIcon(icon);
        r.setPosition(position);
        r.setPermissions(permissions);
        r.setDefault(isDefault);
        r.setAdmin(admin);
        r.setCreatedAt(Instant.now());
        return roleRepository.save(r);
    }
}
