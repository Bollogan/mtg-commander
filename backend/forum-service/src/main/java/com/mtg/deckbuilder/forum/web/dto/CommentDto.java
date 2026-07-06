package com.mtg.deckbuilder.forum.web.dto;

import com.mtg.deckbuilder.forum.domain.Comment;
import java.time.Instant;
import java.util.UUID;

public record CommentDto(
    String id,
    String postId,
    String parentCommentId,
    UUID authorId,
    String authorName,
    String body,
    long upvotes,
    long downvotes,
    long score,
    int myVote,
    Instant createdAt) {

    public static CommentDto from(Comment c) {
        return from(c, 0);
    }

    /** {@code myVote} is the requesting user's vote on this comment (+1/-1), or 0 when none/anonymous. */
    public static CommentDto from(Comment c, int myVote) {
        return new CommentDto(
            c.getId(), c.getPostId(), c.getParentCommentId(), c.getAuthorId(), c.getAuthorName(),
            c.getBody(), c.getUpvotes(), c.getDownvotes(), c.getUpvotes() - c.getDownvotes(),
            myVote, c.getCreatedAt());
    }
}
