package com.mtg.deckbuilder.user.rgpd;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

/** Pulls a user's decks from deck-service for the RGPD data export (best-effort). */
@FeignClient(name = "deck-service", path = "/api/decks")
public interface DeckExportClient {

    @GetMapping("/me")
    List<DeckSummary> myDecks(@RequestHeader("X-User-Id") UUID userId);

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DeckSummary(String id, String name, String format, int totalCards) {
    }
}
