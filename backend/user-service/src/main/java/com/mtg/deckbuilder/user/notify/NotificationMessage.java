package com.mtg.deckbuilder.user.notify;

import java.time.Instant;
import java.util.UUID;

/**
 * Payload published to the Redis {@code notifications} channel and relayed to clients
 * by notification-service over SSE. Kept intentionally small and stable so every
 * producer/consumer agrees on the shape.
 */
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
