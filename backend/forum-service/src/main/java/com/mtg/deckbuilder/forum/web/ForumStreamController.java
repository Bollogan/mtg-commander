package com.mtg.deckbuilder.forum.web;

import com.mtg.deckbuilder.forum.event.ForumEventDispatcher;
import com.mtg.deckbuilder.forum.service.ForumService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Opens a Server-Sent Events stream for a forum (Phase 6): every viewer receives realtime
 * {@link com.mtg.deckbuilder.forum.event.ForumEvent}s (new topics/replies, joins, moderation signals)
 * for that forum. The gateway validates the JWT before this is reached.
 */
@RestController
public class ForumStreamController {

    private final ForumEventDispatcher dispatcher;
    private final ForumService forumService;
    private final long streamTimeoutMillis;

    public ForumStreamController(ForumEventDispatcher dispatcher,
                                 ForumService forumService,
                                 @Value("${forum.events.sse-timeout-ms:3600000}") long streamTimeoutMillis) {
        this.dispatcher = dispatcher;
        this.forumService = forumService;
        this.streamTimeoutMillis = streamTimeoutMillis;
    }

    @GetMapping(value = "/api/forums/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable String id) {
        forumService.get(id); // 404 if the forum doesn't exist
        return dispatcher.register(id, streamTimeoutMillis);
    }

    /**
     * Cross-forum discovery stream powering the mosaic: fans out every forum's {@code FORUM_VOTE}
     * event so cards across all rails update their tallies live. A literal path segment, so it takes
     * precedence over {@code /{id}/stream}.
     */
    @GetMapping(value = "/api/forums/discovery/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter discoveryStream() {
        return dispatcher.registerDiscovery(streamTimeoutMillis);
    }
}
