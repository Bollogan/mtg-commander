package com.mtg.deckbuilder.game.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * A line of room chat. Kept in the room state (bounded, see {@code GameState.MAX_CHAT}).
 * {@code sentAt} is epoch millis rather than an {@code Instant}: this record is serialized both
 * by Spring's ObjectMapper and by netty-socketio's, which format java.time differently.
 */
public record ChatMessage(String id, String authorId, String authorName, String text,
                          long sentAt) {

  /** Chat lines written by the server itself ("X joined", "Y was kicked"). */
  public static final String SYSTEM_AUTHOR = "system";

  public static ChatMessage system(String text) {
    return new ChatMessage(UUID.randomUUID().toString(), SYSTEM_AUTHOR, "System", text,
        Instant.now().toEpochMilli());
  }

  public static ChatMessage from(String authorId, String authorName, String text) {
    return new ChatMessage(UUID.randomUUID().toString(), authorId, authorName, text,
        Instant.now().toEpochMilli());
  }
}
