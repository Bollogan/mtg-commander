package com.mtg.deckbuilder.notification;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Holds live SSE connections per user and pushes notifications to the right recipient.
 * A user may have several emitters open (multiple tabs/devices); dead emitters are pruned
 * on the next failed write.
 */
@Component
public class NotificationDispatcher {

    private static final Logger log = LoggerFactory.getLogger(NotificationDispatcher.class);

    private final ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>> emitters =
        new ConcurrentHashMap<>();

    public SseEmitter register(UUID userId, long timeoutMillis) {
        SseEmitter emitter = new SseEmitter(timeoutMillis);
        CopyOnWriteArrayList<SseEmitter> userEmitters =
            emitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>());
        userEmitters.add(emitter);

        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(e -> remove(userId, emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            remove(userId, emitter);
        }
        return emitter;
    }

    /** Routes a notification to every live emitter of its recipient. */
    public void dispatch(NotificationMessage message) {
        if (message.recipientId() == null) {
            return;
        }
        List<SseEmitter> userEmitters = emitters.get(message.recipientId());
        if (userEmitters == null || userEmitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : userEmitters) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(message));
            } catch (IOException | IllegalStateException e) {
                remove(message.recipientId(), emitter);
            }
        }
    }

    private void remove(UUID userId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters != null) {
            userEmitters.remove(emitter);
            if (userEmitters.isEmpty()) {
                emitters.remove(userId, userEmitters);
            }
        }
    }

    public int activeConnections() {
        return emitters.values().stream().mapToInt(List::size).sum();
    }
}
