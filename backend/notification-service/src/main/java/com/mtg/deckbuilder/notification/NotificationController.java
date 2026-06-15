package com.mtg.deckbuilder.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationDispatcher dispatcher;
    private final RecentNotificationStore recentStore;
    private final long streamTimeoutMillis;

    public NotificationController(NotificationDispatcher dispatcher,
                                 RecentNotificationStore recentStore,
                                 @Value("${notifications.sse-timeout-ms:3600000}") long streamTimeoutMillis) {
        this.dispatcher = dispatcher;
        this.recentStore = recentStore;
        this.streamTimeoutMillis = streamTimeoutMillis;
    }

    /**
     * Opens a Server-Sent Events stream scoped to the authenticated user (X-User-Id). The
     * gateway has already validated the JWT and injected the header.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestHeader("X-User-Id") UUID userId) {
        return dispatcher.register(userId, streamTimeoutMillis);
    }

    /** Backfill: recent notifications for the authenticated user (newest first). */
    @GetMapping
    public List<NotificationMessage> recent(@RequestHeader("X-User-Id") UUID userId,
                                            @RequestParam(defaultValue = "20") int limit) {
        return recentStore.recent(userId, limit);
    }
}
