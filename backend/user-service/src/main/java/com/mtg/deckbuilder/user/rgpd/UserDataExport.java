package com.mtg.deckbuilder.user.rgpd;

import com.mtg.deckbuilder.user.rgpd.DeckExportClient.DeckSummary;
import com.mtg.deckbuilder.user.web.dto.BadgeDto;
import com.mtg.deckbuilder.user.web.dto.ProfileDto;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** RGPD data-portability payload: everything the platform holds about a user, as JSON. */
public record UserDataExport(
    Instant exportedAt,
    ProfileDto profile,
    List<UUID> following,
    List<UUID> followers,
    List<BadgeDto> badges,
    List<DeckSummary> decks) {
}
