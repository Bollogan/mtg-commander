package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.domain.Comment;
import com.mtg.deckbuilder.forum.domain.FlagType;
import com.mtg.deckbuilder.forum.domain.ModerationFlag;
import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.event.ForumEvent;
import com.mtg.deckbuilder.forum.event.ForumEventPublisher;
import com.mtg.deckbuilder.forum.notify.NotificationMessage;
import com.mtg.deckbuilder.forum.notify.NotificationPublisher;
import com.mtg.deckbuilder.forum.repo.CommentRepository;
import com.mtg.deckbuilder.forum.repo.PostRepository;
import com.mtg.deckbuilder.forum.repo.PostRepository.PostIdView;
import com.mtg.deckbuilder.forum.web.NotFoundException;
import com.mtg.deckbuilder.forum.web.dto.ModerationItemDto;
import com.mtg.deckbuilder.forum.web.dto.ModerationStatsDto;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * The per-forum moderation queue (Phase 4, spec §5.3–5.4): lists content held for review, lets a
 * moderator approve or reject it, exposes queue stats, and accepts user reports that push otherwise
 * public content back into review. Approving held content publishes it (bumping activity / comment
 * counts); rejecting keeps it hidden with a reason. All actions are audit-logged.
 *
 * <p>Permission enforcement ({@code canModerate}) lives in the controller; this service assumes the
 * caller is authorised and focuses on correctness (verifying content belongs to the forum).
 */
@Service
public class ModerationQueueService {

    private static final Logger audit = LoggerFactory.getLogger("MODERATION_AUDIT");

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final ForumService forumService;
    private final PostService postService;
    private final NotificationPublisher notifications;
    private final ForumEventPublisher events;

    public ModerationQueueService(PostRepository postRepository,
                                  CommentRepository commentRepository,
                                  ForumService forumService,
                                  PostService postService,
                                  NotificationPublisher notifications,
                                  ForumEventPublisher events) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.forumService = forumService;
        this.postService = postService;
        this.notifications = notifications;
        this.events = events;
    }

    /** What content types to include in a queue view. */
    public enum ItemFilter { ALL, POSTS, COMMENTS }

    /**
     * Content of a forum in the given moderation state, newest first. {@code filter} narrows to
     * topics or replies; {@code limit} caps each content type.
     */
    public List<ModerationItemDto> queue(String forumId, ModerationStatus status, ItemFilter filter, int limit) {
        forumService.get(forumId); // 404 if forum missing
        PageRequest page = PageRequest.of(0, limit);
        List<ModerationItemDto> items = new ArrayList<>();

        if (filter != ItemFilter.COMMENTS) {
            postRepository.findByThreadIdAndModerationStatusOrderByCreatedAtDesc(forumId, status, page)
                .forEach(p -> items.add(ModerationItemDto.fromPost(p)));
        }
        if (filter != ItemFilter.POSTS) {
            List<String> postIds = forumPostIds(forumId);
            if (!postIds.isEmpty()) {
                commentRepository.findByPostIdInAndModerationStatusOrderByCreatedAtDesc(postIds, status, page)
                    .forEach(c -> items.add(ModerationItemDto.fromComment(c, forumId)));
            }
        }
        // Merge topics + replies into one newest-first stream.
        items.sort((a, b) -> b.createdAt().compareTo(a.createdAt()));
        return items;
    }

    public ModerationStatsDto stats(String forumId) {
        forumService.get(forumId);
        List<String> postIds = forumPostIds(forumId);
        long pendingPosts = postRepository.countByThreadIdAndModerationStatus(forumId, ModerationStatus.PENDING);
        long approvedPosts = postRepository.countByThreadIdAndModerationStatus(forumId, ModerationStatus.APPROVED);
        long rejectedPosts = postRepository.countByThreadIdAndModerationStatus(forumId, ModerationStatus.REJECTED);
        long pendingComments = countComments(postIds, ModerationStatus.PENDING);
        long approvedComments = countComments(postIds, ModerationStatus.APPROVED);
        long rejectedComments = countComments(postIds, ModerationStatus.REJECTED);
        return ModerationStatsDto.of(pendingPosts, pendingComments,
            approvedPosts, approvedComments, rejectedPosts, rejectedComments);
    }

    // ── Post actions ────────────────────────────────────────────────────────

    public ModerationItemDto approvePost(String forumId, String postId, UUID moderator) {
        Post post = requirePost(forumId, postId);
        boolean wasHidden = post.getModerationStatus() != ModerationStatus.APPROVED;
        post.setModerationStatus(ModerationStatus.APPROVED);
        post.setRejectionReason(null);
        Post saved = postRepository.save(post);
        if (wasHidden) {
            forumService.touch(forumService.get(forumId)); // publish → bump activity
            notifyAuthor(post.getAuthorId(), moderator, "MODERATION_APPROVED",
                "Your post \"" + post.getTitle() + "\" was approved");
        }
        auditLog("APPROVE", "POST", postId, forumId, moderator, null);
        publishResolved(forumId, postId, "APPROVED");
        return ModerationItemDto.fromPost(saved);
    }

    public ModerationItemDto rejectPost(String forumId, String postId, UUID moderator, String reason) {
        Post post = requirePost(forumId, postId);
        post.setModerationStatus(ModerationStatus.REJECTED);
        post.setRejectionReason(reason);
        Post saved = postRepository.save(post);
        notifyAuthor(post.getAuthorId(), moderator, "MODERATION_REJECTED",
            "Your post \"" + post.getTitle() + "\" was removed" + reasonSuffix(reason));
        auditLog("REJECT", "POST", postId, forumId, moderator, reason);
        publishResolved(forumId, postId, "REJECTED");
        return ModerationItemDto.fromPost(saved);
    }

    /** A user report: flag the post and, if currently public, send it back to review. */
    public ModerationItemDto reportPost(String forumId, String postId, UUID reporter, String reason) {
        Post post = requirePost(forumId, postId);
        post.getModerationFlags().add(userReportFlag(reporter, reason));
        if (post.getModerationStatus() == ModerationStatus.APPROVED) {
            post.setModerationStatus(ModerationStatus.PENDING);
        }
        Post saved = postRepository.save(post);
        auditLog("REPORT", "POST", postId, forumId, reporter, reason);
        publishFlagged(forumId, postId, reporter, "POST");
        return ModerationItemDto.fromPost(saved);
    }

    // ── Comment actions ───────────────────────────────────────────────────────

    public ModerationItemDto approveComment(String forumId, String commentId, UUID moderator) {
        Comment comment = requireComment(forumId, commentId);
        boolean wasHidden = comment.getModerationStatus() != ModerationStatus.APPROVED;
        comment.setModerationStatus(ModerationStatus.APPROVED);
        comment.setRejectionReason(null);
        Comment saved = commentRepository.save(comment);
        if (wasHidden) {
            postRepository.findById(comment.getPostId())
                .ifPresent(postService::incrementCommentCount);
            notifyAuthor(comment.getAuthorId(), moderator, "MODERATION_APPROVED",
                "Your comment was approved");
        }
        auditLog("APPROVE", "COMMENT", commentId, forumId, moderator, null);
        publishResolved(forumId, comment.getPostId(), "APPROVED");
        return ModerationItemDto.fromComment(saved, forumId);
    }

    public ModerationItemDto rejectComment(String forumId, String commentId, UUID moderator, String reason) {
        Comment comment = requireComment(forumId, commentId);
        comment.setModerationStatus(ModerationStatus.REJECTED);
        comment.setRejectionReason(reason);
        Comment saved = commentRepository.save(comment);
        notifyAuthor(comment.getAuthorId(), moderator, "MODERATION_REJECTED",
            "Your comment was removed" + reasonSuffix(reason));
        auditLog("REJECT", "COMMENT", commentId, forumId, moderator, reason);
        publishResolved(forumId, comment.getPostId(), "REJECTED");
        return ModerationItemDto.fromComment(saved, forumId);
    }

    public ModerationItemDto reportComment(String forumId, String commentId, UUID reporter, String reason) {
        Comment comment = requireComment(forumId, commentId);
        comment.getModerationFlags().add(userReportFlag(reporter, reason));
        if (comment.getModerationStatus() == ModerationStatus.APPROVED) {
            comment.setModerationStatus(ModerationStatus.PENDING);
        }
        Comment saved = commentRepository.save(comment);
        auditLog("REPORT", "COMMENT", commentId, forumId, reporter, reason);
        publishFlagged(forumId, comment.getPostId(), reporter, "COMMENT");
        return ModerationItemDto.fromComment(saved, forumId);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private Post requirePost(String forumId, String postId) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new NotFoundException("Post not found: " + postId));
        if (!forumId.equals(post.getThreadId())) {
            throw new NotFoundException("Post does not belong to this forum");
        }
        return post;
    }

    private Comment requireComment(String forumId, String commentId) {
        Comment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new NotFoundException("Comment not found: " + commentId));
        Post parent = postRepository.findById(comment.getPostId())
            .orElseThrow(() -> new NotFoundException("Parent post not found"));
        if (!forumId.equals(parent.getThreadId())) {
            throw new NotFoundException("Comment does not belong to this forum");
        }
        return comment;
    }

    private List<String> forumPostIds(String forumId) {
        return postRepository.findByThreadId(forumId).stream().map(PostIdView::getId).toList();
    }

    private long countComments(List<String> postIds, ModerationStatus status) {
        return postIds.isEmpty() ? 0 : commentRepository.countByPostIdInAndModerationStatus(postIds, status);
    }

    private static ModerationFlag userReportFlag(UUID reporter, String reason) {
        List<String> words = reason == null || reason.isBlank() ? List.of() : List.of(reason);
        return new ModerationFlag(FlagType.OTHER, 0.5, words, "user-report:" + reporter, Instant.now());
    }

    /** Tells moderators' live dashboards that an item was approved/rejected (so it leaves the queue). */
    private void publishResolved(String forumId, String postId, String outcome) {
        events.publish(ForumEvent.of("CONTENT_RESOLVED", forumId)
            .withPost(postId, null)
            .withMessage(outcome));
    }

    /** Tells moderators' live dashboards that a new item needs review. */
    private void publishFlagged(String forumId, String postId, UUID reporter, String kind) {
        events.publish(ForumEvent.of("CONTENT_FLAGGED", forumId)
            .withPost(postId, null)
            .withActor(reporter, null)
            .withMessage(kind));
    }

    private void notifyAuthor(UUID author, UUID actor, String type, String message) {
        if (author != null) {
            notifications.publish(NotificationMessage.of(type, author, actor, message));
        }
    }

    private static String reasonSuffix(String reason) {
        return reason == null || reason.isBlank() ? "" : ": " + reason;
    }

    private void auditLog(String action, String type, String id, String forumId, UUID actor, String reason) {
        audit.info("action={} type={} id={} forum={} actor={} reason={}",
            action, type, id, forumId, actor, reason == null ? "" : reason);
    }
}
