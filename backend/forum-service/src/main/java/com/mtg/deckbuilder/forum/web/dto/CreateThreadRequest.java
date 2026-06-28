package com.mtg.deckbuilder.forum.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateThreadRequest(
    @NotBlank @Size(max = 140) String title,
    @Size(max = 1000) String description,
    @Size(max = 60) String category) {
}
