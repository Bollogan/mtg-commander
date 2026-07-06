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
    long upvotes,
    long downvotes,
    long score,
    int myVote,
    Instant createdAt) {

    public static PostDto from(Post p) {
        return from(p, 0);
    }

    /** {@code myVote} is the requesting user's vote on this post (+1/-1), or 0 when none/anonymous. */
    public static PostDto from(Post p, int myVote) {
        return new PostDto(
            p.getId(), p.getThreadId(), p.getAuthorId(), p.getAuthorName(), p.getAuthorAvatar(),
            p.getTitle(), p.getBody(), excerpt(p.getBody()), p.getCommentCount(),
            p.getUpvotes(), p.getDownvotes(), p.getUpvotes() - p.getDownvotes(), myVote,
            p.getCreatedAt());
    }

    private static String excerpt(String body) {
        if (body == null) {
            return "";
        }
        return body.length() <= 160 ? body : body.substring(0, 160) + "…";
    }
}
