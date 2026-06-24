package com.mtg.deckbuilder.deck.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

/** Minimal projection of a user-service ProfileDto needed to enrich deck responses. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record UserSummary(UUID id, String displayName, String avatarUrl) {
}
