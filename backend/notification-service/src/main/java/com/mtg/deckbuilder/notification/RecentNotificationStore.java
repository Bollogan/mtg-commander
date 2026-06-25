package com.mtg.deckbuilder.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Keeps a capped, per-user history of recent notifications in a Redis list so a client that
 * reconnects (or opens the notification bell) can backfill what it missed while offline.
 */
@Component
public class RecentNotificationStore {

    private static final Logger log = LoggerFactory.getLogger(RecentNotificationStore.class);
    private static final int MAX_PER_USER = 50;

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public RecentNotificationStore(StringRedisTemplate redis, ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    private static String key(UUID userId) {
        return "notifications:recent:" + userId;
    }

    public void save(NotificationMessage message) {
        if (message.recipientId() == null) {
            return;
        }
        try {
            String key = key(message.recipientId());
            redis.opsForList().leftPush(key, objectMapper.writeValueAsString(message));
            redis.opsForList().trim(key, 0, MAX_PER_USER - 1);
        } catch (Exception e) {
            log.warn("Failed to persist recent notification: {}", e.getMessage());
        }
    }

    /** Deletes a user's recent-notification history (RGPD erasure). */
    public void clear(UUID userId) {
        try {
            redis.delete(key(userId));
        } catch (Exception e) {
            log.warn("Failed to clear notifications for {}: {}", userId, e.getMessage());
        }
    }

    public List<NotificationMessage> recent(UUID userId, int limit) {
        try {
            List<String> raw = redis.opsForList().range(key(userId), 0, Math.min(limit, MAX_PER_USER) - 1);
            if (raw == null) {
                return List.of();
            }
            return raw.stream().map(this::parse).filter(java.util.Objects::nonNull).toList();
        } catch (Exception e) {
            log.warn("Failed to read recent notifications for {}: {}", userId, e.getMessage());
            return List.of();
        }
    }

    private NotificationMessage parse(String raw) {
        try {
            return objectMapper.readValue(raw, NotificationMessage.class);
        } catch (Exception e) {
            return null;
        }
    }
}
