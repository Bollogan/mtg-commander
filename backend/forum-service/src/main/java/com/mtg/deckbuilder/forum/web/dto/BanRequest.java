package com.mtg.deckbuilder.forum.web.dto;

import jakarta.validation.constraints.Size;

/** Ban payload. {@code duration} is one of {@code 1d|7d|30d|permanent} (null ⇒ permanent). */
public record BanRequest(
    @Size(max = 500) String reason,
    @Size(max = 10) String duration) {
}
