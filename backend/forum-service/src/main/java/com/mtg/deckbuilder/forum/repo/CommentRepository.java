package com.mtg.deckbuilder.forum.repo;

import com.mtg.deckbuilder.forum.domain.Comment;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CommentRepository extends MongoRepository<Comment, String> {

    List<Comment> findByPostIdOrderByCreatedAtAsc(String postId, Pageable pageable);

    List<Comment> findByPostIdAndCreatedAtGreaterThanOrderByCreatedAtAsc(
        String postId, Instant cursor, Pageable pageable);

    long deleteByAuthorId(UUID authorId);
}
