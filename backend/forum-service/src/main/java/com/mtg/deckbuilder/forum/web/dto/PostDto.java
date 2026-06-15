package com.mtg.deckbuilder.forum.web.dto;

import com.mtg.deckbuilder.forum.domain.Post;
import java.time.Instant;
import java.util.UUID;

public record PostDto(
    String id,
    String threadId,
    UUID authorId,
    String authorName,
    String authorAvatar,
    String title,
    String body,
    String excerpt,
    long commentCount,
    Instant createdAt) {

    public static PostDto from(Post p) {
        return new PostDto(
            p.getId(), p.getThreadId(), p.getAuthorId(), p.getAuthorName(), p.getAuthorAvatar(),
            p.getTitle(), p.getBody(), excerpt(p.getBody()), p.getCommentCount(), p.getCreatedAt());
    }

    private static String excerpt(String body) {
        if (body == null) {
            return "";
        }
        return body.length() <= 160 ? body : body.substring(0, 160) + "…";
    }
}
