package com.mtg.deckbuilder.forum.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreatePostRequest(
    @NotBlank @Size(max = 200) String title,
    @NotBlank @Size(max = 10000) String body) {
}
