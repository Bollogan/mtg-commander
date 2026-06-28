package com.mtg.deckbuilder.user.notify;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes account lifecycle events to a Redis Pub/Sub channel ({@code user-events}).
 * Every domain service subscribes and purges its own data, so an RGPD deletion fans out
 * without user-service needing to know who stores what.
 */
@Component
public class UserEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(UserEventPublisher.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final String channel;

    public UserEventPublisher(StringRedisTemplate redis,
                              ObjectMapper objectMapper,
                              @Value("${user-events.channel:user-events}") String channel) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.channel = channel;
    }

    public void publishUserDeleted(UUID userId) {
        try {
            String payload = objectMapper.writeValueAsString(
                Map.of("type", "USER_DELETED", "userId", userId.toString()));
            redis.convertAndSend(channel, payload);
            log.info("Published USER_DELETED for {}", userId);
        } catch (Exception e) {
            log.error("Failed to publish USER_DELETED for {}: {}", userId, e.getMessage());
        }
    }
}
