package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.domain.Comment;
import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.domain.Vote;
import com.mtg.deckbuilder.forum.domain.VoteTargetType;
import com.mtg.deckbuilder.forum.repo.VoteRepository;
import com.mtg.deckbuilder.forum.web.NotFoundException;
import com.mtg.deckbuilder.forum.web.dto.VoteResultDto;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * Up/down voting on forums, posts and comments. A vote is idempotent per (target, user): casting the same
 * value again, or value {@code 0}, clears it; a different value flips it. The target document's
 * denormalised {@code upvotes}/{@code downvotes} counters are adjusted atomically with {@code $inc}
 * so listings can rank/display without a per-item aggregation.
 */
@Service
public class VoteService {

    private final VoteRepository voteRepository;
    private final MongoTemplate mongoTemplate;

    public VoteService(VoteRepository voteRepository, MongoTemplate mongoTemplate) {
        this.voteRepository = voteRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public VoteResultDto vote(VoteTargetType type, String targetId, UUID userId, int rawValue) {
        int value = Integer.signum(rawValue); // clamp to -1 / 0 / +1
        Class<?> targetClass = targetClass(type);
        if (mongoTemplate.findById(targetId, targetClass) == null) {
            throw new NotFoundException(type + " not found: " + targetId);
        }

        Optional<Vote> existing =
            voteRepository.findByTargetTypeAndTargetIdAndUserId(type, targetId, userId);
        int previous = existing.map(Vote::getValue).orElse(0);

        if (previous != value) {
            long upDelta = (value == 1 ? 1 : 0) - (previous == 1 ? 1 : 0);
            long downDelta = (value == -1 ? 1 : 0) - (previous == -1 ? 1 : 0);
            mongoTemplate.updateFirst(
                new Query(Criteria.where("_id").is(targetId)),
                new Update().inc("upvotes", upDelta).inc("downvotes", downDelta),
                targetClass);

            if (value == 0) {
                existing.ifPresent(voteRepository::delete);
            } else {
                Vote vote = existing.orElseGet(Vote::new);
                vote.setTargetType(type);
                vote.setTargetId(targetId);
                vote.setUserId(userId);
                vote.setValue(value);
                if (vote.getCreatedAt() == null) {
                    vote.setCreatedAt(Instant.now());
                }
                try {
                    voteRepository.save(vote);
                } catch (DuplicateKeyException race) {
                    // A concurrent first-vote won the unique index; our counter $inc already landed.
                }
            }
        }

        Object updated = mongoTemplate.findById(targetId, targetClass);
        long up;
        long down;
        if (updated instanceof Post p) {
            up = p.getUpvotes();
            down = p.getDownvotes();
        } else if (updated instanceof Comment c) {
            up = c.getUpvotes();
            down = c.getDownvotes();
        } else {
            Thread th = (Thread) updated;
            up = th.getUpvotes();
            down = th.getDownvotes();
        }
        return VoteResultDto.of(up, down, value);
    }

    /** Map of targetId → the user's vote (+1/-1) for the given targets; absent entries mean no vote. */
    public Map<String, Integer> myVotes(VoteTargetType type, UUID userId, Collection<String> ids) {
        if (userId == null || ids == null || ids.isEmpty()) {
            return Map.of();
        }
        List<Vote> votes = voteRepository.findByTargetTypeAndUserIdAndTargetIdIn(type, userId, ids);
        Map<String, Integer> result = new HashMap<>();
        for (Vote v : votes) {
            result.put(v.getTargetId(), v.getValue());
        }
        return result;
    }

    private static Class<?> targetClass(VoteTargetType type) {
        return switch (type) {
            case FORUM -> Thread.class;
            case POST -> Post.class;
            case COMMENT -> Comment.class;
        };
    }
}
