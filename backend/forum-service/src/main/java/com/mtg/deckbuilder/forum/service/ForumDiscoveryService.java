package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.domain.ForumCategory;
import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.web.dto.ForumSearchCriteria;
import com.mtg.deckbuilder.forum.web.dto.SearchResultPage;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

/**
 * Read-side queries that power forum discovery (spec §2.1–2.3): the Trending / Rising / New rails of
 * the mosaic and the advanced full-text-ish search. Built on {@link MongoTemplate} so filters and
 * sort orders can be composed dynamically without an explosion of derived repository methods.
 *
 * <p>Only APPROVED, non-private forums surface here.
 */
@Service
public class ForumDiscoveryService {

    /** A forum counts as "rising" only within this window after creation. */
    static final Duration RISING_WINDOW = Duration.ofDays(30);
    /** Upper bound of documents scanned when ranking by relevance in memory. */
    static final int RELEVANCE_SCAN_CAP = 500;

    private final MongoTemplate mongoTemplate;

    public ForumDiscoveryService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    /** Highest weekly activity first — the headline "most active forums" rail. */
    public List<Thread> trending(int limit) {
        Query query = new Query(publicApproved())
            .with(Sort.by(Sort.Direction.DESC, "weeklyActivityScore", "lastActivityAt"))
            .limit(clampLimit(limit));
        return mongoTemplate.find(query, Thread.class);
    }

    /** Young forums (created within {@link #RISING_WINDOW}) with the most momentum. */
    public List<Thread> rising(int limit) {
        Instant since = Instant.now().minus(RISING_WINDOW);
        Query query = new Query(publicApproved().and("createdAt").gt(since))
            .with(Sort.by(Sort.Direction.DESC, "weeklyActivityScore", "createdAt"))
            .limit(clampLimit(limit));
        return mongoTemplate.find(query, Thread.class);
    }

    /** Most recently created forums. */
    public List<Thread> newest(int limit) {
        Query query = new Query(publicApproved())
            .with(Sort.by(Sort.Direction.DESC, "createdAt"))
            .limit(clampLimit(limit));
        return mongoTemplate.find(query, Thread.class);
    }

    /**
     * Advanced search: matches the query text across the selected fields and applies the category /
     * language / activity / member-count / NSFW filters, then orders by the requested strategy.
     * Relevance ordering is computed in memory (field-weighted); the other strategies push sorting
     * down to Mongo.
     */
    public SearchResultPage<Thread> search(ForumSearchCriteria criteria) {
        Criteria mongoCriteria = buildCriteria(criteria);
        long total = mongoTemplate.count(new Query(mongoCriteria), Thread.class);

        int page = Math.max(0, criteria.page());
        int size = criteria.size() <= 0 ? 20 : Math.min(criteria.size(), 50);
        String sortBy = criteria.effectiveSortBy();

        List<Thread> items;
        if ("relevance".equals(sortBy) && criteria.hasQuery()) {
            items = searchByRelevance(mongoCriteria, criteria.query(), page, size);
        } else {
            Query query = new Query(mongoCriteria)
                .with(sortFor(sortBy))
                .skip((long) page * size)
                .limit(size);
            items = mongoTemplate.find(query, Thread.class);
        }
        return SearchResultPage.of(items, total, page, size);
    }

    private List<Thread> searchByRelevance(Criteria criteria, String query, int page, int size) {
        Query scan = new Query(criteria)
            .with(Sort.by(Sort.Direction.DESC, "weeklyActivityScore"))
            .limit(RELEVANCE_SCAN_CAP);
        List<Thread> matches = new ArrayList<>(mongoTemplate.find(scan, Thread.class));
        String needle = query.toLowerCase(Locale.ROOT).trim();
        matches.sort(Comparator.comparingLong((Thread t) -> relevanceScore(t, needle)).reversed()
            .thenComparing(Comparator.comparingLong(Thread::getWeeklyActivityScore).reversed()));

        int from = Math.min(page * size, matches.size());
        int to = Math.min(from + size, matches.size());
        return matches.subList(from, to);
    }

    /** Field-weighted relevance: title beats description beats tags; exact/prefix title matches rank highest. */
    static long relevanceScore(Thread t, String needle) {
        long score = 0;
        String title = t.getTitle() == null ? "" : t.getTitle().toLowerCase(Locale.ROOT);
        if (title.equals(needle)) {
            score += 1000;
        } else if (title.startsWith(needle)) {
            score += 400;
        } else if (title.contains(needle)) {
            score += 200;
        }
        String desc = t.getDescription() == null ? "" : t.getDescription().toLowerCase(Locale.ROOT);
        if (desc.contains(needle)) {
            score += 60;
        }
        if (t.getTags() != null) {
            for (String tag : t.getTags()) {
                if (tag != null && tag.toLowerCase(Locale.ROOT).contains(needle)) {
                    score += 40;
                    break;
                }
            }
        }
        return score;
    }

    private Criteria buildCriteria(ForumSearchCriteria c) {
        // Combine every clause under a single $and to avoid the mixed and()/andOperator() pitfall.
        List<Criteria> clauses = new ArrayList<>();
        clauses.add(Criteria.where("moderationStatus").is(ModerationStatus.APPROVED));
        clauses.add(Criteria.where("isPrivate").is(false));

        if (c.hasQuery()) {
            clauses.add(queryCriteria(c.query(), c.effectiveSearchIn()));
        }
        if (c.category() != null && !c.category().isBlank() && !"all".equalsIgnoreCase(c.category())) {
            clauses.add(Criteria.where("category").is(ForumCategory.parse(c.category()).name()));
        }
        if (c.language() != null && !c.language().isBlank()) {
            clauses.add(Criteria.where("language").is(c.language()));
        }
        if (c.nsfw() != null) {
            clauses.add(Criteria.where("nsfw").is(c.nsfw()));
        }
        memberCountCriteria(c.minMembers(), c.maxMembers()).ifPresent(clauses::add);
        activityLevelCriteria(c.activityLevel()).ifPresent(clauses::add);
        return new Criteria().andOperator(clauses.toArray(new Criteria[0]));
    }

    /** OR of case-insensitive regex matches over the selected text fields (name→title). */
    private Criteria queryCriteria(String query, Set<String> searchIn) {
        Pattern regex = Pattern.compile(Pattern.quote(query.trim()), Pattern.CASE_INSENSITIVE);
        List<Criteria> ors = new ArrayList<>();
        if (searchIn.contains("name")) {
            ors.add(Criteria.where("title").regex(regex));
        }
        if (searchIn.contains("description")) {
            ors.add(Criteria.where("description").regex(regex));
        }
        if (searchIn.contains("tags")) {
            ors.add(Criteria.where("tags").regex(regex));
        }
        if (ors.isEmpty()) {
            ors.add(Criteria.where("title").regex(regex));
        }
        return new Criteria().orOperator(ors.toArray(new Criteria[0]));
    }

    private static Optional<Criteria> memberCountCriteria(Long min, Long max) {
        if (min == null && max == null) {
            return Optional.empty();
        }
        Criteria criteria = Criteria.where("memberCount");
        if (min != null) {
            criteria = criteria.gte(min);
        }
        if (max != null) {
            criteria = criteria.lte(max);
        }
        return Optional.of(criteria);
    }

    private static Optional<Criteria> activityLevelCriteria(String level) {
        if (level == null || level.isBlank() || "all".equalsIgnoreCase(level)) {
            return Optional.empty();
        }
        return switch (level.toLowerCase(Locale.ROOT)) {
            case "high" -> Optional.of(Criteria.where("weeklyActivityScore").gte(50));
            case "medium" -> Optional.of(Criteria.where("weeklyActivityScore").gte(10).lt(50));
            case "low" -> Optional.of(Criteria.where("weeklyActivityScore").lt(10));
            default -> Optional.empty();
        };
    }

    private static Sort sortFor(String sortBy) {
        return switch (sortBy == null ? "" : sortBy.toLowerCase(Locale.ROOT)) {
            case "members" -> Sort.by(Sort.Direction.DESC, "memberCount");
            case "newest" -> Sort.by(Sort.Direction.DESC, "createdAt");
            case "name" -> Sort.by(Sort.Direction.ASC, "title");
            default -> Sort.by(Sort.Direction.DESC, "weeklyActivityScore", "lastActivityAt");
        };
    }

    /** Base filter shared by every discovery query: publicly visible, moderation-approved forums. */
    private static Criteria publicApproved() {
        return Criteria.where("moderationStatus").is(ModerationStatus.APPROVED).and("isPrivate").is(false);
    }

    private static int clampLimit(int limit) {
        return Math.max(1, Math.min(limit, 50));
    }
}
