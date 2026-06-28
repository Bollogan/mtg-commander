package com.mtg.deckbuilder.notification;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import java.util.UUID;

/** Notification payload received from the Redis {@code notifications} channel. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record NotificationMessage(
    String id,
    String type,
    UUID recipientId,
    UUID actorId,
    String message,
    Instant createdAt) {
}
