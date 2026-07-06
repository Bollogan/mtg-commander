package com.mtg.deckbuilder.forum.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.web.dto.ForumSearchCriteria;
import com.mtg.deckbuilder.forum.web.dto.SearchResultPage;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

class ForumDiscoveryServiceTest {

    private final MongoTemplate mongoTemplate = mock(MongoTemplate.class);
    private final ForumDiscoveryService service = new ForumDiscoveryService(mongoTemplate);

    private Thread forum(String title, String description, List<String> tags) {
        Thread t = new Thread();
        t.setTitle(title);
        t.setDescription(description);
        t.setTags(tags);
        return t;
    }

    @Test
    void relevanceScoreRanksTitleAboveDescriptionAboveTags() {
        Thread exact = forum("commander", "x", List.of());
        Thread prefix = forum("Commander Central", "x", List.of());
        Thread inDesc = forum("Deck Help", "great for commander decks", List.of());
        Thread inTags = forum("Random", "nothing", List.of("commander"));
        Thread noMatch = forum("Random", "nothing", List.of("modern"));

        assertThat(ForumDiscoveryService.relevanceScore(exact, "commander")).isEqualTo(1000);
        assertThat(ForumDiscoveryService.relevanceScore(prefix, "commander")).isEqualTo(400);
        assertThat(ForumDiscoveryService.relevanceScore(inDesc, "commander")).isEqualTo(60);
        assertThat(ForumDiscoveryService.relevanceScore(inTags, "commander")).isEqualTo(40);
        assertThat(ForumDiscoveryService.relevanceScore(noMatch, "commander")).isEqualTo(0);
    }

    @Test
    void searchByRelevanceSortsResultsInMemory() {
        Thread exact = forum("commander", "x", List.of());
        Thread prefix = forum("Commander Central", "x", List.of());
        Thread inDesc = forum("Deck Help", "great for commander decks", List.of());

        when(mongoTemplate.count(any(Query.class), eq(Thread.class))).thenReturn(3L);
        // Returned deliberately out of relevance order.
        when(mongoTemplate.find(any(Query.class), eq(Thread.class)))
            .thenReturn(List.of(inDesc, exact, prefix));

        ForumSearchCriteria criteria = new ForumSearchCriteria(
            "commander", Set.of("name", "description"), null, null, null, null, null,
            "relevance", null, 0, 20);
        SearchResultPage<Thread> page = service.search(criteria);

        assertThat(page.total()).isEqualTo(3);
        assertThat(page.items()).containsExactly(exact, prefix, inDesc);
        assertThat(page.hasMore()).isFalse();
    }

    @Test
    void nonRelevanceSortDefersToMongoOrder() {
        Thread a = forum("Alpha", "", List.of());
        Thread b = forum("Beta", "", List.of());

        when(mongoTemplate.count(any(Query.class), eq(Thread.class))).thenReturn(5L);
        when(mongoTemplate.find(any(Query.class), eq(Thread.class))).thenReturn(List.of(a, b));

        ForumSearchCriteria criteria = new ForumSearchCriteria(
            null, Set.of(), null, null, null, null, null, "newest", null, 0, 2);
        SearchResultPage<Thread> page = service.search(criteria);

        // Mongo order preserved; more pages remain (2 of 5).
        assertThat(page.items()).containsExactly(a, b);
        assertThat(page.total()).isEqualTo(5);
        assertThat(page.hasMore()).isTrue();
    }
}
