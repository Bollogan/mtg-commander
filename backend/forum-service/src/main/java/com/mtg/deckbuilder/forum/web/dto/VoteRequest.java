package com.mtg.deckbuilder.forum.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** A vote intent: {@code 1} upvote, {@code -1} downvote, {@code 0} clear the caller's vote. */
public record VoteRequest(@Min(-1) @Max(1) int value) {
}
