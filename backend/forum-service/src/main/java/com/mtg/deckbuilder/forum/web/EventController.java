package com.mtg.deckbuilder.forum.web;

import com.mtg.deckbuilder.forum.service.EventService;
import com.mtg.deckbuilder.forum.web.dto.CreateEventRequest;
import com.mtg.deckbuilder.forum.web.dto.EventDto;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public List<EventDto> list(@RequestParam(defaultValue = "30") int limit) {
        return eventService.list(limit).stream().map(EventDto::from).toList();
    }

    @GetMapping("/{id}")
    public EventDto get(@PathVariable String id) {
        return EventDto.from(eventService.get(id));
    }

    @PostMapping
    public ResponseEntity<EventDto> create(@RequestHeader("X-User-Id") UUID userId,
                                           @Valid @RequestBody CreateEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(EventDto.from(eventService.create(userId, request)));
    }

    @PostMapping("/{id}/register")
    public EventDto register(@RequestHeader("X-User-Id") UUID userId, @PathVariable String id) {
        return EventDto.from(eventService.register(id, userId));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> conflict(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
    }
}
