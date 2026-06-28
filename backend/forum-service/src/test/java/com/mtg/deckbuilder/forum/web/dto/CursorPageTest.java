package com.mtg.deckbuilder.forum.web.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class CursorPageTest {

    @Test
    void encodeDecodeRoundTrips() {
        Instant now = Instant.parse("2026-06-15T10:15:30Z");
        String cursor = CursorPage.encodeCursor(now);
        assertThat(CursorPage.decodeCursor(cursor)).isEqualTo(now);
    }

    @Test
    void decodeBlankCursorIsNull() {
        assertThat(CursorPage.decodeCursor(null)).isNull();
        assertThat(CursorPage.decodeCursor("")).isNull();
    }

    @Test
    void ofTrimsExtraItemAndSetsHasMore() {
        Instant base = Instant.parse("2026-06-15T10:00:00Z");
        // limit = 2, fetched 3 (limit + 1) => hasMore true, page size 2, cursor = 2nd item ts
        List<Instant> fetched = List.of(base, base.minusSeconds(1), base.minusSeconds(2));
        CursorPage<Instant> page = CursorPage.of(fetched, 2, i -> i);

        assertThat(page.items()).hasSize(2);
        assertThat(page.hasMore()).isTrue();
        assertThat(page.nextCursor()).isEqualTo(CursorPage.encodeCursor(base.minusSeconds(1)));
    }

    @Test
    void ofWithoutExtraItemHasNoMore() {
        Instant base = Instant.parse("2026-06-15T10:00:00Z");
        CursorPage<Instant> page = CursorPage.of(List.of(base), 2, i -> i);

        assertThat(page.items()).hasSize(1);
        assertThat(page.hasMore()).isFalse();
        assertThat(page.nextCursor()).isNull();
    }
}
