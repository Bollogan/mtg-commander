package com.mtg.deckbuilder.forum.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

/**
 * Redis Pub/Sub listener on the {@code forum-events} channel: deserialises each event and hands it to
 * the {@link ForumEventDispatcher} for SSE fan-out to this instance's forum viewers.
 */
@Component
public class ForumEventSubscriber implements MessageListener {

    private static final Logger log = LoggerFactory.getLogger(ForumEventSubscriber.class);

    private final ObjectMapper objectMapper;
    private final ForumEventDispatcher dispatcher;

    public ForumEventSubscriber(ObjectMapper objectMapper, ForumEventDispatcher dispatcher) {
        this.objectMapper = objectMapper;
        this.dispatcher = dispatcher;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String body = new String(message.getBody(), StandardCharsets.UTF_8);
        try {
            dispatcher.dispatch(objectMapper.readValue(body, ForumEvent.class));
        } catch (Exception e) {
            log.warn("Dropped malformed forum event: {}", e.getMessage());
        }
    }
}
