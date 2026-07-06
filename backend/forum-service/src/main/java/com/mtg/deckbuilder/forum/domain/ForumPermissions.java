package com.mtg.deckbuilder.forum.domain;

/**
 * Discord-style boolean permission set attached to a {@link ForumRole}. Factory methods provide
 * the two roles every forum starts with: a full-power {@link #admin()} and a sensible
 * {@link #member()} default.
 */
public class ForumPermissions {

    private boolean canView = true;
    private boolean canPost = true;
    private boolean canCreateThread = true;
    private boolean canEditOwnContent = true;
    private boolean canDeleteOwnContent = true;
    private boolean canDeleteAnyContent;
    private boolean canPinThreads;
    private boolean canLockThreads;
    private boolean canManageRoles;
    private boolean canBanUsers;
    private boolean canInviteUsers = true;
    private boolean canEditForumSettings;
    private boolean canViewAuditLog;
    private boolean canModerate;

    public ForumPermissions() {
    }

    /** The default role granted on join: read, post, create threads and edit/delete own content. */
    public static ForumPermissions member() {
        return new ForumPermissions();
    }

    /** The creator/admin role: every permission enabled. */
    public static ForumPermissions admin() {
        ForumPermissions p = new ForumPermissions();
        p.canDeleteAnyContent = true;
        p.canPinThreads = true;
        p.canLockThreads = true;
        p.canManageRoles = true;
        p.canBanUsers = true;
        p.canEditForumSettings = true;
        p.canViewAuditLog = true;
        p.canModerate = true;
        return p;
    }

    /** A moderator role: content + user moderation, but no role/settings management. */
    public static ForumPermissions moderator() {
        ForumPermissions p = new ForumPermissions();
        p.canDeleteAnyContent = true;
        p.canPinThreads = true;
        p.canLockThreads = true;
        p.canBanUsers = true;
        p.canViewAuditLog = true;
        p.canModerate = true;
        return p;
    }

    public boolean isCanView() { return canView; }
    public void setCanView(boolean v) { this.canView = v; }
    public boolean isCanPost() { return canPost; }
    public void setCanPost(boolean v) { this.canPost = v; }
    public boolean isCanCreateThread() { return canCreateThread; }
    public void setCanCreateThread(boolean v) { this.canCreateThread = v; }
    public boolean isCanEditOwnContent() { return canEditOwnContent; }
    public void setCanEditOwnContent(boolean v) { this.canEditOwnContent = v; }
    public boolean isCanDeleteOwnContent() { return canDeleteOwnContent; }
    public void setCanDeleteOwnContent(boolean v) { this.canDeleteOwnContent = v; }
    public boolean isCanDeleteAnyContent() { return canDeleteAnyContent; }
    public void setCanDeleteAnyContent(boolean v) { this.canDeleteAnyContent = v; }
    public boolean isCanPinThreads() { return canPinThreads; }
    public void setCanPinThreads(boolean v) { this.canPinThreads = v; }
    public boolean isCanLockThreads() { return canLockThreads; }
    public void setCanLockThreads(boolean v) { this.canLockThreads = v; }
    public boolean isCanManageRoles() { return canManageRoles; }
    public void setCanManageRoles(boolean v) { this.canManageRoles = v; }
    public boolean isCanBanUsers() { return canBanUsers; }
    public void setCanBanUsers(boolean v) { this.canBanUsers = v; }
    public boolean isCanInviteUsers() { return canInviteUsers; }
    public void setCanInviteUsers(boolean v) { this.canInviteUsers = v; }
    public boolean isCanEditForumSettings() { return canEditForumSettings; }
    public void setCanEditForumSettings(boolean v) { this.canEditForumSettings = v; }
    public boolean isCanViewAuditLog() { return canViewAuditLog; }
    public void setCanViewAuditLog(boolean v) { this.canViewAuditLog = v; }
    public boolean isCanModerate() { return canModerate; }
    public void setCanModerate(boolean v) { this.canModerate = v; }
}
