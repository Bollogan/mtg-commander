package com.mtg.deckbuilder.forum.web.dto;

import java.util.List;

/**
 * An offset-paginated slice of forum search results, with the total match count so the UI can
 * render page controls. Unlike the infinite-scroll {@link CursorPage}, advanced search is
 * random-access (jump to page N, show "X results").
 */
public record SearchResultPage<T>(List<T> items, long total, int page, int size, boolean hasMore) {

    public static <T> SearchResultPage<T> of(List<T> items, long total, int page, int size) {
        boolean hasMore = (long) (page + 1) * size < total;
        return new SearchResultPage<>(items, total, page, size, hasMore);
    }
}
