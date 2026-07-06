package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.client.UserSummary;
import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.event.ForumEvent;
import com.mtg.deckbuilder.forum.event.ForumEventPublisher;
import com.mtg.deckbuilder.forum.moderation.ContentType;
import com.mtg.deckbuilder.forum.moderation.ModerationResult;
import com.mtg.deckbuilder.forum.moderation.ModerationService;
import com.mtg.deckbuilder.forum.notify.NotificationMessage;
import com.mtg.deckbuilder.forum.notify.NotificationPublisher;
import com.mtg.deckbuilder.forum.repo.PostRepository;
import com.mtg.deckbuilder.forum.web.ModerationRejectedException;
import com.mtg.deckbuilder.forum.web.NotFoundException;
import com.mtg.deckbuilder.forum.web.dto.CreatePostRequest;
import com.mtg.deckbuilder.forum.web.dto.CursorPage;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final ForumService forumService;
    private final UserEnrichmentService enrichment;
    private final NotificationPublisher notifications;
    private final ModerationService moderationService;
    private final MongoTemplate mongoTemplate;
    private final ForumEventPublisher events;

    public PostService(PostRepository postRepository,
                       ForumService forumService,
                       UserEnrichmentService enrichment,
                       NotificationPublisher notifications,
                       ModerationService moderationService,
                       MongoTemplate mongoTemplate,
                       ForumEventPublisher events) {
        this.postRepository = postRepository;
        this.forumService = forumService;
        this.enrichment = enrichment;
        this.notifications = notifications;
        this.moderationService = moderationService;
        this.mongoTemplate = mongoTemplate;
        this.events = events;
    }

    public Post get(String id) {
        return postRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Post not found: " + id));
    }

    /**
     * Creates a post in a forum: runs it through content moderation, enriches author identity from
     * user-service (denormalised so later reads avoid N+1), and — only when the post is APPROVED —
     * bumps the forum's activity and fans out a NEW_POST notification to the author's followers.
     * A hard violation is rejected outright (422); a borderline one is held PENDING for review and
     * kept out of public listings until a moderator approves it.
     */
    public Post create(String threadId, UUID authorId, CreatePostRequest req) {
        Thread thread = forumService.get(threadId);

        ModerationResult mod = moderationService.moderate(
            join(req.title(), req.body()), ContentType.THREAD_CREATION);
        if (mod.isBlocked()) {
            throw new ModerationRejectedException(mod.reason());
        }

        UserSummary author = enrichment.lookup(authorId);
        Post post = new Post();
        post.setThreadId(threadId);
        post.setAuthorId(authorId);
        post.setAuthorName(author.displayName());
        post.setAuthorAvatar(author.avatarUrl());
        post.setTitle(req.title());
        post.setBody(req.body());
        post.setModerationStatus(mod.toStatus());
        post.setModerationFlags(new ArrayList<>(mod.flags()));
        if (mod.needsReview()) {
            post.setRejectionReason(mod.reason());
        }
        post.setCreatedAt(Instant.now());
        Post saved = postRepository.save(post);

        // Held content is invisible until approved, so it must not bump activity or notify anyone.
        if (saved.getModerationStatus() == ModerationStatus.APPROVED) {
            forumService.touch(thread);
            notifyFollowers(authorId, author.displayName(), saved);
            events.publish(ForumEvent.of("NEW_POST", threadId)
                .withPost(saved.getId(), saved.getTitle())
                .withActor(authorId, author.displayName()));
        } else {
            // Held for review → let moderators' dashboards light up in realtime.
            events.publish(ForumEvent.of("CONTENT_FLAGGED", threadId)
                .withPost(saved.getId(), saved.getTitle())
                .withActor(authorId, author.displayName())
                .withMessage("POST"));
        }
        return saved;
    }

    private void notifyFollowers(UUID authorId, String authorName, Post post) {
        for (UUID follower : enrichment.followersOf(authorId)) {
            notifications.publish(NotificationMessage.of(
                "NEW_POST", follower, authorId,
                authorName + " published \"" + post.getTitle() + "\""));
        }
    }

    /** Cursor-paginated posts within a forum, newest first — only publicly-visible (approved) posts. */
    public CursorPage<Post> listByThread(String threadId, String cursor, int limit) {
        forumService.get(threadId); // 404 if forum missing
        Instant before = CursorPage.decodeCursor(cursor);

        List<Criteria> and = new ArrayList<>();
        and.add(Criteria.where("threadId").is(threadId));
        and.add(publiclyVisible());
        if (before != null) {
            and.add(Criteria.where("createdAt").lt(before));
        }
        Query query = new Query(new Criteria().andOperator(and.toArray(new Criteria[0])))
            .with(Sort.by(Sort.Direction.DESC, "createdAt"))
            .limit(limit + 1);
        List<Post> fetched = mongoTemplate.find(query, Post.class);
        return CursorPage.of(fetched, limit, Post::getCreatedAt);
    }

    /**
     * "Publicly visible" = APPROVED, tolerating pre-Phase-4 documents that predate the moderation
     * field (absent {@code moderationStatus} is treated as approved).
     */
    static Criteria publiclyVisible() {
        return new Criteria().orOperator(
            Criteria.where("moderationStatus").is(ModerationStatus.APPROVED),
            Criteria.where("moderationStatus").exists(false));
    }

    private static String join(String title, String body) {
        return (title == null ? "" : title) + "\n" + (body == null ? "" : body);
    }

    /** Recent posts authored by any of the given users (drives the user-service feed). */
    public List<Post> byAuthors(List<UUID> authorIds, int limit) {
        if (authorIds == null || authorIds.isEmpty()) {
            return List.of();
        }
        return postRepository.findByAuthorIdInOrderByCreatedAtDesc(
            authorIds, PageRequest.of(0, Math.min(limit, 100)));
    }

    public void incrementCommentCount(Post post) {
        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);
    }
}
