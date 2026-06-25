package com.mtg.deckbuilder.forum.repo;

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

    long deleteByAuthorId(UUID authorId);
}
