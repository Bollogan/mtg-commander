package com.mtg.deckbuilder.forum.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

/** Minimal projection of a user-service ProfileDto needed to enrich forum content. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record UserSummary(UUID id, String displayName, String avatarUrl) {
}
