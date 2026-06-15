package com.mtg.deckbuilder.forum.notify;

import java.time.Instant;
import java.util.UUID;

/** Shared notification payload shape (mirrors the one published by user-service). */
public record NotificationMessage(
    String id,
    String type,
    UUID recipientId,
    UUID actorId,
    String message,
    Instant createdAt) {

    public static NotificationMessage of(String type, UUID recipientId, UUID actorId, String message) {
        return new NotificationMessage(
            UUID.randomUUID().toString(), type, recipientId, actorId, message, Instant.now());
    }
}
