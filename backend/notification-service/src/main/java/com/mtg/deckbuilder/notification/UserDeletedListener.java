package com.mtg.deckbuilder.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

/** On {@code USER_DELETED}, clears the user's stored recent-notification history. */
@Component
public class UserDeletedListener implements MessageListener {

    private static final Logger log = LoggerFactory.getLogger(UserDeletedListener.class);

    private final RecentNotificationStore store;
    private final ObjectMapper objectMapper;

    public UserDeletedListener(RecentNotificationStore store, ObjectMapper objectMapper) {
        this.store = store;
        this.objectMapper = objectMapper;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            JsonNode event = objectMapper.readTree(message.getBody());
            if (!"USER_DELETED".equals(event.path("type").asText())) {
                return;
            }
            UUID userId = UUID.fromString(event.path("userId").asText());
            store.clear(userId);
            log.info("USER_DELETED: cleared notifications for {}", userId);
        } catch (Exception e) {
            log.error("Failed to process user event: {}", e.getMessage());
        }
    }
}
