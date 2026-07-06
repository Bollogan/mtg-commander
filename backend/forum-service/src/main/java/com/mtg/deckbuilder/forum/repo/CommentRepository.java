package com.mtg.deckbuilder.forum.repo;

import com.mtg.deckbuilder.forum.domain.Comment;
import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CommentRepository extends MongoRepository<Comment, String> {

    List<Comment> findByPostIdOrderByCreatedAtAsc(String postId, Pageable pageable);

    List<Comment> findByPostIdAndCreatedAtGreaterThanOrderByCreatedAtAsc(
        String postId, Instant cursor, Pageable pageable);

    /** Replies posted since the given instant across a set of topics — feeds the activity score. */
    long countByPostIdInAndCreatedAtAfter(Collection<String> postIds, Instant after);

    /** Moderation queue: replies (across a forum's topics) in a given moderation state, newest first. */
    List<Comment> findByPostIdInAndModerationStatusOrderByCreatedAtDesc(
        Collection<String> postIds, ModerationStatus status, Pageable pageable);

    long countByPostIdInAndModerationStatus(Collection<String> postIds, ModerationStatus status);

    long deleteByAuthorId(UUID authorId);
}
