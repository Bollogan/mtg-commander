package com.mtg.deckbuilder.forum.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Request to create a forum board. Only title is required; the rest configure category, tags,
 * imagery, language and privacy. Name + description pass through moderation before creation.
 */
public record CreateThreadRequest(
    @NotBlank @Size(max = 140) String title,
    @Size(max = 1000) String description,
    @Size(max = 60) String category,
    @Size(max = 10) List<@Size(max = 40) String> tags,
    @Size(max = 500) String coverImage,
    @Size(max = 500) String bannerImage,
    @Size(max = 20) String language,
    Boolean nsfw,
    Boolean isPrivate) {
}
