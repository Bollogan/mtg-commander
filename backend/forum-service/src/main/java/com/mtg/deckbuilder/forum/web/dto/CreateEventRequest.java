package com.mtg.deckbuilder.forum.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record CreateEventRequest(
    @NotBlank @Size(min = 3, max = 120) String title,
    @Size(max = 2000) String description,
    @NotBlank @Size(max = 30) String format,
    @Min(2) int capacity,
    Instant startsAt) {
}
