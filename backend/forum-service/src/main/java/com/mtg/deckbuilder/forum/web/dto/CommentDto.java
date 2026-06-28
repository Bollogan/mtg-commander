package com.mtg.deckbuilder.forum.web.dto;

import com.mtg.deckbuilder.forum.domain.Comment;
import java.time.Instant;
import java.util.UUID;

public record CommentDto(
    String id,
    String postId,
    UUID authorId,
    String authorName,
    String body,
    Instant createdAt) {

    public static CommentDto from(Comment c) {
        return new CommentDto(
            c.getId(), c.getPostId(), c.getAuthorId(), c.getAuthorName(), c.getBody(), c.getCreatedAt());
    }
}
