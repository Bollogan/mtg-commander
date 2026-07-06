package com.mtg.deckbuilder.forum.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes {@link ForumEvent}s to the {@code forum-events} Redis Pub/Sub channel. Every forum-service
 * instance subscribes, so events fan out across the cluster (and to each instance's SSE clients).
 * Failures are logged and swallowed so realtime never breaks the originating action.
 */
@Component
public class ForumEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(ForumEventPublisher.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final String channel;

    public ForumEventPublisher(StringRedisTemplate redis,
                               ObjectMapper objectMapper,
                               @Value("${forum.events.channel:forum-events}") String channel) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.channel = channel;
    }

    public void publish(ForumEvent event) {
        try {
            redis.convertAndSend(channel, objectMapper.writeValueAsString(event));
        } catch (JsonProcessingException | RuntimeException e) {
            log.warn("Failed to publish forum event {}: {}", event.type(), e.getMessage());
        }
    }
}
