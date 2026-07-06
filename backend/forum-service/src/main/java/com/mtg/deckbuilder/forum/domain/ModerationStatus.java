package com.mtg.deckbuilder.forum.domain;

/**
 * Moderation lifecycle of a piece of user content (forum, thread or post).
 * {@code APPROVED} content is publicly visible; {@code PENDING} awaits human review;
 * {@code REJECTED} is hidden (with a {@code rejectionReason}).
 */
public enum ModerationStatus {
    APPROVED,
    PENDING,
    REJECTED
}
