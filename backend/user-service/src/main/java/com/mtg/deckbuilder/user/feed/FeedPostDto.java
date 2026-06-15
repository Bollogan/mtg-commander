package com.mtg.deckbuilder.user.feed;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import java.util.UUID;

/**
 * Subset of a forum post needed to render a feed item. Extra fields returned by
 * forum-service are ignored so the two services can evolve independently.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FeedPostDto(
    String id,
    String threadId,
    UUID authorId,
    String authorName,
    String title,
    String excerpt,
    Instant createdAt) {
}
