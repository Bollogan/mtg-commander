package com.mtg.deckbuilder.forum.web.dto;

/**
 * Body of a reject / report action: an optional human-readable reason (shown to the content author
 * and stored on the item).
 */
public record ModerationActionRequest(String reason) {
}
