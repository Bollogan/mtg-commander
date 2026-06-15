package com.mtg.deckbuilder.user.web.dto;

import com.mtg.deckbuilder.user.domain.Badge;
import java.time.Instant;

public record BadgeDto(String type, String label, String description, Instant awardedAt) {

    public static BadgeDto from(Badge b) {
        return new BadgeDto(
            b.getType().name(),
            b.getType().getLabel(),
            b.getType().getDescription(),
            b.getAwardedAt());
    }
}
