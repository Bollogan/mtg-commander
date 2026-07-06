package com.mtg.deckbuilder.forum.web.dto;

import java.util.List;

/**
 * The three curated rails of the forum discovery mosaic (spec §2.1): {@code trending} (highest
 * weekly activity), {@code rising} (young forums gaining momentum) and {@code newest} (recently
 * created). Each is a plain list ordered for direct rendering.
 */
public record DiscoveryRailsDto(
    List<ThreadDto> trending,
    List<ThreadDto> rising,
    List<ThreadDto> newest) {
}
