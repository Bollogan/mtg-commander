package com.mtg.deckbuilder.forum.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code parentCommentId} is the reply target for a nested reply, or {@code null} for top-level. */
public record CreateCommentRequest(
    @NotBlank @Size(max = 5000) String body,
    String parentCommentId) {
}
