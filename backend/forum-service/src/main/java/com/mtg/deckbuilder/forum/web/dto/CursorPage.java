package com.mtg.deckbuilder.forum.web.dto;

import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.function.Function;

/**
 * Cursor-based page. The cursor is an opaque, URL-safe Base64 encoding of the boundary
 * item's {@code createdAt} timestamp — avoids offset/skip scans (and N+1) on Mongo.
 */
public record CursorPage<T>(List<T> items, String nextCursor, boolean hasMore) {

    public static String encodeCursor(Instant instant) {
        return Base64.getUrlEncoder().withoutPadding()
            .encodeToString(instant.toString().getBytes());
    }

    public static Instant decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        return Instant.parse(new String(Base64.getUrlDecoder().decode(cursor)));
    }

    /**
     * Builds a page from a list fetched with {@code limit + 1} items: the extra item signals
     * {@code hasMore} and its boundary timestamp becomes the next cursor.
     */
    public static <T> CursorPage<T> of(List<T> fetched, int limit, Function<T, Instant> timestamp) {
        boolean hasMore = fetched.size() > limit;
        List<T> page = hasMore ? fetched.subList(0, limit) : fetched;
        String next = hasMore && !page.isEmpty()
            ? encodeCursor(timestamp.apply(page.get(page.size() - 1)))
            : null;
        return new CursorPage<>(page, next, hasMore);
    }
}
