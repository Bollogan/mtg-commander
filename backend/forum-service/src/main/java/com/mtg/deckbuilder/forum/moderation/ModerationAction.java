package com.mtg.deckbuilder.forum.moderation;

/**
 * Outcome of moderating a piece of content.
 * <ul>
 *   <li>{@code ALLOW} — publish immediately (possibly with soft flags),</li>
 *   <li>{@code PENDING_REVIEW} — hold for a human moderator,</li>
 *   <li>{@code BLOCK} — reject outright.</li>
 * </ul>
 */
public enum ModerationAction {
    ALLOW,
    PENDING_REVIEW,
    BLOCK
}
