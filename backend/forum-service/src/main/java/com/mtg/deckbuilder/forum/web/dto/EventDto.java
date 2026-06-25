package com.mtg.deckbuilder.forum.web.dto;

import com.mtg.deckbuilder.forum.domain.Event;
import java.time.Instant;
import java.util.UUID;

public record EventDto(
    String id,
    String title,
    String description,
    String format,
    UUID organizerId,
    String organizerName,
    int capacity,
    int spotsLeft,
    int participantCount,
    String status,
    Instant startsAt,
    Instant createdAt) {

    public static EventDto from(Event e) {
        return new EventDto(
            e.getId(), e.getTitle(), e.getDescription(), e.getFormat(),
            e.getOrganizerId(), e.getOrganizerName(), e.getCapacity(), e.getSpotsLeft(),
            e.getParticipants().size(), e.getStatus().name(), e.getStartsAt(), e.getCreatedAt());
    }
}
