package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.client.UserSummary;
import com.mtg.deckbuilder.forum.domain.Comment;
import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.notify.NotificationMessage;
import com.mtg.deckbuilder.forum.notify.NotificationPublisher;
import com.mtg.deckbuilder.forum.repo.CommentRepository;
import com.mtg.deckbuilder.forum.web.dto.CreateCommentRequest;
import com.mtg.deckbuilder.forum.web.dto.CursorPage;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostService postService;
    private final UserEnrichmentService enrichment;
    private final NotificationPublisher notifications;

    public CommentService(CommentRepository commentRepository,
                          PostService postService,
                          UserEnrichmentService enrichment,
                          NotificationPublisher notifications) {
        this.commentRepository = commentRepository;
        this.postService = postService;
        this.enrichment = enrichment;
        this.notifications = notifications;
    }

    public Comment create(String postId, UUID authorId, CreateCommentRequest req) {
        Post post = postService.get(postId);
        UserSummary author = enrichment.lookup(authorId);

        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setAuthorId(authorId);
        comment.setAuthorName(author.displayName());
        comment.setBody(req.body());
        comment.setCreatedAt(Instant.now());
        Comment saved = commentRepository.save(comment);

        postService.incrementCommentCount(post);

        // Notify the post author of the reply (unless replying to themselves).
        if (!authorId.equals(post.getAuthorId())) {
            notifications.publish(NotificationMessage.of(
                "NEW_COMMENT", post.getAuthorId(), authorId,
                author.displayName() + " commented on \"" + post.getTitle() + "\""));
        }
        return saved;
    }

    /** Cursor-paginated comments, oldest first (natural reading order). */
    public CursorPage<Comment> list(String postId, String cursor, int limit) {
        postService.get(postId); // 404 if post missing
        Instant after = CursorPage.decodeCursor(cursor);
        PageRequest page = PageRequest.of(0, limit + 1);
        List<Comment> fetched = after == null
            ? commentRepository.findByPostIdOrderByCreatedAtAsc(postId, page)
            : commentRepository.findByPostIdAndCreatedAtGreaterThanOrderByCreatedAtAsc(postId, after, page);
        return CursorPage.of(fetched, limit, Comment::getCreatedAt);
    }
}
