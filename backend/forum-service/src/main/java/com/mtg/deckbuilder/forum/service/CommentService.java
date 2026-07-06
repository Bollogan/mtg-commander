package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.client.UserSummary;
import com.mtg.deckbuilder.forum.domain.Comment;
import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.event.ForumEvent;
import com.mtg.deckbuilder.forum.event.ForumEventPublisher;
import com.mtg.deckbuilder.forum.moderation.ContentType;
import com.mtg.deckbuilder.forum.moderation.ModerationResult;
import com.mtg.deckbuilder.forum.moderation.ModerationService;
import com.mtg.deckbuilder.forum.notify.NotificationMessage;
import com.mtg.deckbuilder.forum.notify.NotificationPublisher;
import com.mtg.deckbuilder.forum.repo.CommentRepository;
import com.mtg.deckbuilder.forum.web.ModerationRejectedException;
import com.mtg.deckbuilder.forum.web.NotFoundException;
import com.mtg.deckbuilder.forum.web.dto.CreateCommentRequest;
import com.mtg.deckbuilder.forum.web.dto.CursorPage;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostService postService;
    private final UserEnrichmentService enrichment;
    private final NotificationPublisher notifications;
    private final ModerationService moderationService;
    private final MongoTemplate mongoTemplate;
    private final ForumEventPublisher events;

    public CommentService(CommentRepository commentRepository,
                          PostService postService,
                          UserEnrichmentService enrichment,
                          NotificationPublisher notifications,
                          ModerationService moderationService,
                          MongoTemplate mongoTemplate,
                          ForumEventPublisher events) {
        this.commentRepository = commentRepository;
        this.postService = postService;
        this.enrichment = enrichment;
        this.notifications = notifications;
        this.moderationService = moderationService;
        this.mongoTemplate = mongoTemplate;
        this.events = events;
    }

    /**
     * Creates a reply after content moderation. A hard violation is rejected (422); a borderline one
     * is held PENDING and hidden until approved. Only APPROVED replies bump the topic's comment count
     * and notify the topic author.
     */
    public Comment create(String postId, UUID authorId, CreateCommentRequest req) {
        Post post = postService.get(postId);

        // A nested reply must target a comment that lives on this same post.
        String parentId = normalizeParent(req.parentCommentId());
        if (parentId != null) {
            Comment parent = commentRepository.findById(parentId)
                .orElseThrow(() -> new NotFoundException("Parent comment not found: " + parentId));
            if (!postId.equals(parent.getPostId())) {
                throw new NotFoundException("Parent comment does not belong to this post");
            }
        }

        ModerationResult mod = moderationService.moderate(req.body(), ContentType.POST_CREATION);
        if (mod.isBlocked()) {
            throw new ModerationRejectedException(mod.reason());
        }

        UserSummary author = enrichment.lookup(authorId);
        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setParentCommentId(parentId);
        comment.setAuthorId(authorId);
        comment.setAuthorName(author.displayName());
        comment.setBody(req.body());
        comment.setModerationStatus(mod.toStatus());
        comment.setModerationFlags(new ArrayList<>(mod.flags()));
        if (mod.needsReview()) {
            comment.setRejectionReason(mod.reason());
        }
        comment.setCreatedAt(Instant.now());
        Comment saved = commentRepository.save(comment);

        if (saved.getModerationStatus() == ModerationStatus.APPROVED) {
            postService.incrementCommentCount(post);
            // Notify the post author of the reply (unless replying to themselves).
            if (!authorId.equals(post.getAuthorId())) {
                notifications.publish(NotificationMessage.of(
                    "NEW_COMMENT", post.getAuthorId(), authorId,
                    author.displayName() + " commented on \"" + post.getTitle() + "\""));
            }
            events.publish(ForumEvent.of("NEW_REPLY", post.getThreadId())
                .withPost(postId, post.getTitle())
                .withActor(authorId, author.displayName()));
        } else {
            events.publish(ForumEvent.of("CONTENT_FLAGGED", post.getThreadId())
                .withPost(postId, post.getTitle())
                .withActor(authorId, author.displayName())
                .withMessage("COMMENT"));
        }
        return saved;
    }

    /** Cursor-paginated comments, oldest first — only publicly-visible (approved) replies. */
    public CursorPage<Comment> list(String postId, String cursor, int limit) {
        postService.get(postId); // 404 if post missing
        Instant after = CursorPage.decodeCursor(cursor);

        List<Criteria> and = new ArrayList<>();
        and.add(Criteria.where("postId").is(postId));
        and.add(PostService.publiclyVisible());
        if (after != null) {
            and.add(Criteria.where("createdAt").gt(after));
        }
        Query query = new Query(new Criteria().andOperator(and.toArray(new Criteria[0])))
            .with(Sort.by(Sort.Direction.ASC, "createdAt"))
            .limit(limit + 1);
        List<Comment> fetched = mongoTemplate.find(query, Comment.class);
        return CursorPage.of(fetched, limit, Comment::getCreatedAt);
    }

    private static String normalizeParent(String parentCommentId) {
        if (parentCommentId == null || parentCommentId.isBlank()) {
            return null;
        }
        return parentCommentId;
    }
}
