package com.mtg.deckbuilder.forum.event;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Holds live SSE connections per forum and fans {@link ForumEvent}s out to everyone watching that
 * forum (a "room"). A forum may have many emitters (many viewers/tabs); dead emitters are pruned on
 * the next failed write. Mirrors notification-service's dispatcher but keyed by forum, not user.
 */
@Component
public class ForumEventDispatcher {

    /**
     * Reserved room key for the cross-forum "discovery" stream that powers the mosaic. It can never
     * collide with a real forum id (Mongo ObjectId hex), so it lives in the same room map.
     */
    public static final String DISCOVERY_ROOM = "__discovery__";

    private final ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>> rooms =
        new ConcurrentHashMap<>();

    /** Opens an emitter on the shared discovery room (all forums' {@code FORUM_VOTE} events). */
    public SseEmitter registerDiscovery(long timeoutMillis) {
        return register(DISCOVERY_ROOM, timeoutMillis);
    }

    public SseEmitter register(String forumId, long timeoutMillis) {
        SseEmitter emitter = new SseEmitter(timeoutMillis);
        CopyOnWriteArrayList<SseEmitter> forumEmitters =
            rooms.computeIfAbsent(forumId, k -> new CopyOnWriteArrayList<>());
        forumEmitters.add(emitter);

        emitter.onCompletion(() -> remove(forumId, emitter));
        emitter.onTimeout(() -> remove(forumId, emitter));
        emitter.onError(e -> remove(forumId, emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data(forumId));
        } catch (IOException e) {
            remove(forumId, emitter);
        }
        return emitter;
    }

    /**
     * Broadcasts an event to every live emitter of its forum. {@code FORUM_VOTE} events are also fanned
     * out to the shared discovery room so the mosaic's cards update live regardless of which forum they
     * belong to.
     */
    public void dispatch(ForumEvent event) {
        if (event.forumId() == null) {
            return;
        }
        fanOut(event.forumId(), event);
        if ("FORUM_VOTE".equals(event.type())) {
            fanOut(DISCOVERY_ROOM, event);
        }
    }

    private void fanOut(String roomId, ForumEvent event) {
        List<SseEmitter> emitters = rooms.get(roomId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("forum-event").data(event));
            } catch (IOException | IllegalStateException e) {
                remove(roomId, emitter);
            }
        }
    }

    private void remove(String forumId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> forumEmitters = rooms.get(forumId);
        if (forumEmitters != null) {
            forumEmitters.remove(emitter);
            if (forumEmitters.isEmpty()) {
                rooms.remove(forumId, forumEmitters);
            }
        }
    }

    public int activeConnections() {
        return rooms.values().stream().mapToInt(List::size).sum();
    }
}
