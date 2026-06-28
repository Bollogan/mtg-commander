package com.mtg.deckbuilder.forum.web.dto;

import com.mtg.deckbuilder.forum.domain.Thread;
import java.time.Instant;
import java.util.UUID;

public record ThreadDto(
    String id,
    String title,
    String description,
    String category,
    UUID authorId,
    String authorName,
    long postCount,
    Instant lastActivityAt,
    Instant createdAt) {

    public static ThreadDto from(Thread t) {
        return new ThreadDto(
            t.getId(), t.getTitle(), t.getDescription(), t.getCategory(),
            t.getAuthorId(), t.getAuthorName(), t.getPostCount(),
            t.getLastActivityAt(), t.getCreatedAt());
    }
}
