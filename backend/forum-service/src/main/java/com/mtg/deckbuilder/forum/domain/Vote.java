package com.mtg.deckbuilder.forum.domain;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A single user's up/down vote on a {@link Post} or {@link Comment}. One row per (target, user):
 * the unique index enforces "one vote per user per item", so re-voting toggles/updates the existing
 * row rather than stacking. The denormalised {@code upvotes}/{@code downvotes} tallies on the target
 * document are the source of truth for display; this collection records who voted (and how) so a
 * user can change or clear their vote.
 */
@Document(collection = "votes")
@CompoundIndex(name = "vote_target_user_unique",
    def = "{'targetType': 1, 'targetId': 1, 'userId': 1}", unique = true)
public class Vote {

    @Id
    private String id;

    private VoteTargetType targetType;
    private String targetId;
    private UUID userId;

    /** +1 for an upvote, -1 for a downvote (0 is never persisted — it means "cleared"). */
    private int value;

    private Instant createdAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public VoteTargetType getTargetType() {
        return targetType;
    }

    public void setTargetType(VoteTargetType targetType) {
        this.targetType = targetType;
    }

    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public int getValue() {
        return value;
    }

    public void setValue(int value) {
        this.value = value;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
