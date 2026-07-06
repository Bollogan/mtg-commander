package com.mtg.deckbuilder.forum.domain;

/**
 * Per-forum configuration flags, embedded on the {@link Thread} (forum board) document.
 */
public class ForumSettings {

    private boolean requireApprovalToJoin;
    private boolean allowGuestViewing = true;
    /** When true, new threads/posts start PENDING until a moderator approves them. */
    private boolean premoderateContent;

    public ForumSettings() {
    }

    public static ForumSettings defaults() {
        return new ForumSettings();
    }

    public boolean isRequireApprovalToJoin() {
        return requireApprovalToJoin;
    }

    public void setRequireApprovalToJoin(boolean requireApprovalToJoin) {
        this.requireApprovalToJoin = requireApprovalToJoin;
    }

    public boolean isAllowGuestViewing() {
        return allowGuestViewing;
    }

    public void setAllowGuestViewing(boolean allowGuestViewing) {
        this.allowGuestViewing = allowGuestViewing;
    }

    public boolean isPremoderateContent() {
        return premoderateContent;
    }

    public void setPremoderateContent(boolean premoderateContent) {
        this.premoderateContent = premoderateContent;
    }
}
