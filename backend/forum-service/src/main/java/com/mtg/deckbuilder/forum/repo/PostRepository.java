package com.mtg.deckbuilder.forum.repo;

import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import com.mtg.deckbuilder.forum.domain.Post;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PostRepository extends MongoRepository<Post, String> {

    List<Post> findByThreadIdOrderByCreatedAtDesc(String threadId, Pageable pageable);

    List<Post> findByThreadIdAndCreatedAtLessThanOrderByCreatedAtDesc(
        String threadId, Instant cursor, Pageable pageable);

    List<Post> findByAuthorIdInOrderByCreatedAtDesc(List<UUID> authorIds, Pageable pageable);

    /** Topics created in a forum since the given instant — feeds the weekly activity score. */
    List<Post> findByThreadIdAndCreatedAtAfter(String threadId, Instant after);

    /** Lightweight id-only projection of every topic in a forum (used to scope comment counts). */
    List<PostIdView> findByThreadId(String threadId);

    /** Moderation queue: topics of a forum in a given moderation state, newest first. */
    List<Post> findByThreadIdAndModerationStatusOrderByCreatedAtDesc(
        String threadId, ModerationStatus status, Pageable pageable);

    long countByThreadIdAndModerationStatus(String threadId, ModerationStatus status);

    long deleteByAuthorId(UUID authorId);

    /** Projection exposing just the post id, so activity scoring doesn't load full documents. */
    interface PostIdView {
        String getId();
    }
}
