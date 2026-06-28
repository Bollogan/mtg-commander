package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.client.UserClient;
import com.mtg.deckbuilder.forum.client.UserSummary;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Wraps {@link UserClient} with graceful degradation so forum content stays available even
 * if user-service is temporarily down (enrichment falls back to a generic display name).
 */
@Service
public class UserEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(UserEnrichmentService.class);
    private static final UserSummary UNKNOWN = new UserSummary(null, "Unknown Planeswalker", null);

    private final UserClient userClient;

    public UserEnrichmentService(UserClient userClient) {
        this.userClient = userClient;
    }

    public UserSummary lookup(UUID userId) {
        try {
            UserSummary summary = userClient.getUser(userId);
            return summary != null ? summary : UNKNOWN;
        } catch (Exception e) {
            log.warn("user-service enrichment failed for {}: {}", userId, e.getMessage());
            return UNKNOWN;
        }
    }

    public List<UUID> followersOf(UUID userId) {
        try {
            return userClient.followers(userId);
        } catch (Exception e) {
            log.warn("user-service followers lookup failed for {}: {}", userId, e.getMessage());
            return List.of();
        }
    }
}
