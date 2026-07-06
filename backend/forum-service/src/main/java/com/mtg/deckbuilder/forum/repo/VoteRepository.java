package com.mtg.deckbuilder.forum.repo;

import com.mtg.deckbuilder.forum.domain.Vote;
import com.mtg.deckbuilder.forum.domain.VoteTargetType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface VoteRepository extends MongoRepository<Vote, String> {

    Optional<Vote> findByTargetTypeAndTargetIdAndUserId(
        VoteTargetType targetType, String targetId, UUID userId);

    /** A user's votes across a batch of targets — used to enrich reads with the caller's own vote. */
    List<Vote> findByTargetTypeAndUserIdAndTargetIdIn(
        VoteTargetType targetType, UUID userId, Collection<String> targetIds);

    long deleteByUserId(UUID userId);
}
