package com.mtg.deckbuilder.forum.repo;

import com.mtg.deckbuilder.forum.domain.ForumMembership;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ForumMembershipRepository extends MongoRepository<ForumMembership, String> {

    Optional<ForumMembership> findByForumIdAndUserId(String forumId, UUID userId);

    List<ForumMembership> findByForumIdOrderByJoinedAtDesc(String forumId, Pageable pageable);

    long countByForumId(String forumId);

    /** Members who joined since the given instant — feeds the weekly activity score. */
    long countByForumIdAndJoinedAtAfter(String forumId, Instant after);

    boolean existsByForumIdAndUserId(String forumId, UUID userId);

    long deleteByForumId(String forumId);

    long deleteByUserId(UUID userId);
}
