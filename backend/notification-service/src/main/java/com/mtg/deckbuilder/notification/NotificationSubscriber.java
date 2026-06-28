package com.mtg.deckbuilder.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

/**
 * Redis Pub/Sub listener: deserialises each message on the {@code notifications} channel and
 * hands it to the {@link NotificationDispatcher} for SSE fan-out.
 */
@Component
public class NotificationSubscriber implements MessageListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationSubscriber.class);

    private final ObjectMapper objectMapper;
    private final NotificationDispatcher dispatcher;
    private final RecentNotificationStore recentStore;

    public NotificationSubscriber(ObjectMapper objectMapper,
                                  NotificationDispatcher dispatcher,
                                  RecentNotificationStore recentStore) {
        this.objectMapper = objectMapper;
        this.dispatcher = dispatcher;
        this.recentStore = recentStore;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String body = new String(message.getBody(), StandardCharsets.UTF_8);
        try {
            NotificationMessage notification = objectMapper.readValue(body, NotificationMessage.class);
            recentStore.save(notification);
            dispatcher.dispatch(notification);
        } catch (Exception e) {
            log.warn("Dropped malformed notification: {}", e.getMessage());
        }
    }
}
