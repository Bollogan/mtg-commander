package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.repo.CommentRepository;
import com.mtg.deckbuilder.forum.repo.ForumMembershipRepository;
import com.mtg.deckbuilder.forum.repo.PostRepository;
import com.mtg.deckbuilder.forum.repo.PostRepository.PostIdView;
import com.mtg.deckbuilder.forum.repo.ThreadRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Computes each forum's {@code weeklyActivityScore} — the metric that ranks the Trending / Rising
 * discovery rails (spec §2.2). Weighs the last 7 days of new topics, replies, members and unique
 * posters, with a recency bonus when the forum saw activity in the last 24h. A scheduled job
 * refreshes every forum periodically so scores decay as their contributing events age out.
 *
 * <p>Model mapping to the spec formula: the spec's "threads" are our {@link Post}s (topics) and its
 * "posts" are our {@code Comment}s (replies).
 */
@Service
public class ActivityScoreService {

    private static final Logger log = LoggerFactory.getLogger(ActivityScoreService.class);

    static final Duration ACTIVITY_WINDOW = Duration.ofDays(7);
    static final Duration RECENCY_WINDOW = Duration.ofDays(1);

    static final int WEIGHT_NEW_TOPICS = 10;
    static final int WEIGHT_NEW_REPLIES = 3;
    static final int WEIGHT_NEW_MEMBERS = 5;
    static final int WEIGHT_UNIQUE_POSTERS = 8;
    static final double RECENCY_BONUS = 1.5;

    private final ThreadRepository threadRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final ForumMembershipRepository membershipRepository;

    public ActivityScoreService(ThreadRepository threadRepository,
                                PostRepository postRepository,
                                CommentRepository commentRepository,
                                ForumMembershipRepository membershipRepository) {
        this.threadRepository = threadRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.membershipRepository = membershipRepository;
    }

    /**
     * Recomputes the weekly activity score for one forum and persists it. Returns the new score.
     */
    public long recompute(Thread forum) {
        Instant now = Instant.now();
        Instant weekAgo = now.minus(ACTIVITY_WINDOW);
        Instant dayAgo = now.minus(RECENCY_WINDOW);

        List<Post> recentTopics = postRepository.findByThreadIdAndCreatedAtAfter(forum.getId(), weekAgo);
        long newTopics = recentTopics.size();
        long uniquePosters = recentTopics.stream()
            .map(Post::getAuthorId)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .count();

        long newReplies = countRecentReplies(forum.getId(), weekAgo);
        long newMembers = membershipRepository.countByForumIdAndJoinedAtAfter(forum.getId(), weekAgo);

        boolean active = forum.getLastActivityAt() != null && forum.getLastActivityAt().isAfter(dayAgo);
        double recencyBonus = active ? RECENCY_BONUS : 1.0;

        long score = Math.round(
            (newTopics * WEIGHT_NEW_TOPICS
                + newReplies * WEIGHT_NEW_REPLIES
                + newMembers * WEIGHT_NEW_MEMBERS
                + uniquePosters * WEIGHT_UNIQUE_POSTERS) * recencyBonus);

        forum.setWeeklyActivityScore(score);
        threadRepository.save(forum);
        return score;
    }

    /** Counts replies posted this week on any topic belonging to the forum. */
    private long countRecentReplies(String forumId, Instant weekAgo) {
        List<String> postIds = postRepository.findByThreadId(forumId).stream()
            .map(PostIdView::getId)
            .toList();
        if (postIds.isEmpty()) {
            return 0;
        }
        return commentRepository.countByPostIdInAndCreatedAtAfter(postIds, weekAgo);
    }

    /**
     * Periodically refreshes the activity score of every forum. Hourly by default; the cron can be
     * overridden via {@code forum.activity-score.cron}.
     */
    @Scheduled(cron = "${forum.activity-score.cron:0 0 * * * *}")
    public void recomputeAll() {
        List<Thread> forums = threadRepository.findAll();
        long touched = 0;
        for (Thread forum : forums) {
            try {
                recompute(forum);
                touched++;
            } catch (RuntimeException e) {
                log.warn("Failed to recompute activity score for forum {}", forum.getId(), e);
            }
        }
        log.info("Recomputed weekly activity score for {} forum(s)", touched);
    }
}
