package com.mtg.deckbuilder.forum.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when the automatic moderation engine blocks content outright (confidence over the block
 * threshold). Surfaced as HTTP 422 so the UI can show the rejection reason to the author.
 */
@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class ModerationRejectedException extends RuntimeException {
    public ModerationRejectedException(String message) {
        super(message);
    }
}
