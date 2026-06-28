package com.mtg.deckbuilder.forum.notify;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes notifications to the Redis Pub/Sub channel consumed by notification-service.
 * Failures are logged and swallowed so they never break the originating action.
 */
@Component
public class NotificationPublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationPublisher.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final String channel;

    public NotificationPublisher(StringRedisTemplate redis,
                                 ObjectMapper objectMapper,
                                 @Value("${notifications.channel:notifications}") String channel) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.channel = channel;
    }

    public void publish(NotificationMessage message) {
        try {
            redis.convertAndSend(channel, objectMapper.writeValueAsString(message));
        } catch (JsonProcessingException | RuntimeException e) {
            log.warn("Failed to publish notification {}: {}", message.type(), e.getMessage());
        }
    }
}
