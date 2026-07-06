package com.mtg.deckbuilder.forum.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import java.util.UUID;

/**
 * A realtime forum event (Phase 6, spec §7.2) fanned out to everyone watching a forum's SSE stream.
 * Published to the {@code forum-events} Redis channel and re-broadcast per {@code forumId}.
 *
 * <p>{@code type} is one of: {@code NEW_POST}, {@code NEW_REPLY}, {@code MEMBER_JOINED},
 * {@code MEMBER_LEFT}, {@code CONTENT_FLAGGED}, {@code CONTENT_RESOLVED}, {@code ACTIVITY_UPDATE},
 * {@code FORUM_VOTE} (carries the forum's refreshed {@code upvotes}/{@code downvotes}/{@code score}).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ForumEvent(
    String type,
    String forumId,
    String postId,
    UUID actorId,
    String actorName,
    String title,
    String message,
    long upvotes,
    long downvotes,
    long score,
    Instant at) {

    public static ForumEvent of(String type, String forumId) {
        return new ForumEvent(type, forumId, null, null, null, null, null, 0, 0, 0, Instant.now());
    }

    public ForumEvent withPost(String postId, String title) {
        return new ForumEvent(type, forumId, postId, actorId, actorName, title, message,
            upvotes, downvotes, score, at);
    }

    public ForumEvent withActor(UUID actorId, String actorName) {
        return new ForumEvent(type, forumId, postId, actorId, actorName, title, message,
            upvotes, downvotes, score, at);
    }

    public ForumEvent withMessage(String message) {
        return new ForumEvent(type, forumId, postId, actorId, actorName, title, message,
            upvotes, downvotes, score, at);
    }

    /** Attaches the forum's refreshed vote tallies (net {@code score} = up - down). */
    public ForumEvent withVote(long upvotes, long downvotes) {
        return new ForumEvent(type, forumId, postId, actorId, actorName, title, message,
            upvotes, downvotes, upvotes - downvotes, at);
    }
}
