package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.client.UserSummary;
import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.notify.NotificationMessage;
import com.mtg.deckbuilder.forum.notify.NotificationPublisher;
import com.mtg.deckbuilder.forum.repo.PostRepository;
import com.mtg.deckbuilder.forum.web.NotFoundException;
import com.mtg.deckbuilder.forum.web.dto.CreatePostRequest;
import com.mtg.deckbuilder.forum.web.dto.CursorPage;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final ForumService forumService;
    private final UserEnrichmentService enrichment;
    private final NotificationPublisher notifications;

    public PostService(PostRepository postRepository,
                       ForumService forumService,
                       UserEnrichmentService enrichment,
                       NotificationPublisher notifications) {
        this.postRepository = postRepository;
        this.forumService = forumService;
        this.enrichment = enrichment;
        this.notifications = notifications;
    }

    public Post get(String id) {
        return postRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Post not found: " + id));
    }

    /**
     * Creates a post in a forum: enriches author identity from user-service (denormalised so
     * later reads avoid N+1), bumps the forum's activity, then fans out a NEW_POST notification
     * to the author's followers via Redis.
     */
    public Post create(String threadId, UUID authorId, CreatePostRequest req) {
        Thread thread = forumService.get(threadId);
        UserSummary author = enrichment.lookup(authorId);

        Post post = new Post();
        post.setThreadId(threadId);
        post.setAuthorId(authorId);
        post.setAuthorName(author.displayName());
        post.setAuthorAvatar(author.avatarUrl());
        post.setTitle(req.title());
        post.setBody(req.body());
        post.setCreatedAt(Instant.now());
        Post saved = postRepository.save(post);

        forumService.touch(thread);
        notifyFollowers(authorId, author.displayName(), saved);
        return saved;
    }

    private void notifyFollowers(UUID authorId, String authorName, Post post) {
        for (UUID follower : enrichment.followersOf(authorId)) {
            notifications.publish(NotificationMessage.of(
                "NEW_POST", follower, authorId,
                authorName + " published \"" + post.getTitle() + "\""));
        }
    }

    /** Cursor-paginated posts within a forum, newest first. */
    public CursorPage<Post> listByThread(String threadId, String cursor, int limit) {
        forumService.get(threadId); // 404 if forum missing
        Instant before = CursorPage.decodeCursor(cursor);
        PageRequest page = PageRequest.of(0, limit + 1);
        List<Post> fetched = before == null
            ? postRepository.findByThreadIdOrderByCreatedAtDesc(threadId, page)
            : postRepository.findByThreadIdAndCreatedAtLessThanOrderByCreatedAtDesc(threadId, before, page);
        return CursorPage.of(fetched, limit, Post::getCreatedAt);
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
