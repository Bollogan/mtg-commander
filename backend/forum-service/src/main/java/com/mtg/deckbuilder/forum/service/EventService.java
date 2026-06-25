package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.client.UserSummary;
import com.mtg.deckbuilder.forum.domain.Event;
import com.mtg.deckbuilder.forum.notify.NotificationMessage;
import com.mtg.deckbuilder.forum.notify.NotificationPublisher;
import com.mtg.deckbuilder.forum.repo.EventRepository;
import com.mtg.deckbuilder.forum.web.NotFoundException;
import com.mtg.deckbuilder.forum.web.dto.CreateEventRequest;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final UserEnrichmentService enrichment;
    private final NotificationPublisher notifications;

    public EventService(EventRepository eventRepository,
                        UserEnrichmentService enrichment,
                        NotificationPublisher notifications) {
        this.eventRepository = eventRepository;
        this.enrichment = enrichment;
        this.notifications = notifications;
    }

    public Event get(String id) {
        return eventRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Event not found: " + id));
    }

    public List<Event> list(int limit) {
        return eventRepository.findByOrderByStartsAtAsc(PageRequest.of(0, Math.min(limit, 100)));
    }

    /** Creates an event and announces open slots to the organizer's followers. */
    public Event create(UUID organizerId, CreateEventRequest req) {
        UserSummary organizer = enrichment.lookup(organizerId);

        Event event = new Event();
        event.setTitle(req.title());
        event.setDescription(req.description());
        event.setFormat(req.format());
        event.setCapacity(req.capacity());
        event.setStartsAt(req.startsAt());
        event.setOrganizerId(organizerId);
        event.setOrganizerName(organizer.displayName());
        event.setCreatedAt(Instant.now());
        Event saved = eventRepository.save(event);

        announceOpenSpots(saved, organizerId, organizer.displayName());
        return saved;
    }

    /** Registers a participant; flips status to FULL when capacity is reached. */
    public Event register(String eventId, UUID userId) {
        Event event = get(eventId);
        if (event.getStatus() == Event.Status.CLOSED) {
            throw new IllegalStateException("Event registration is closed");
        }
        if (event.isFull()) {
            throw new IllegalStateException("Event is full");
        }
        if (!event.getParticipants().contains(userId)) {
            event.getParticipants().add(userId);
        }
        if (event.isFull()) {
            event.setStatus(Event.Status.FULL);
        }
        return eventRepository.save(event);
    }

    private void announceOpenSpots(Event event, UUID organizerId, String organizerName) {
        for (UUID follower : enrichment.followersOf(organizerId)) {
            notifications.publish(NotificationMessage.of(
                "NEW_EVENT", follower, organizerId,
                organizerName + " opened registration for \"" + event.getTitle() + "\""));
        }
    }
}
