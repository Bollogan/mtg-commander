package com.mtg.deckbuilder.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * Directed follow relationship: {@code followerId} follows {@code followingId}.
 */
@Entity
@Table(
    name = "follows",
    uniqueConstraints = @UniqueConstraint(columnNames = {"followerId", "followingId"}),
    indexes = {
        @Index(name = "idx_follow_following", columnList = "followingId"),
        @Index(name = "idx_follow_follower", columnList = "followerId")
    })
public class Follow {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false)
    private UUID followerId;

    @Column(nullable = false)
    private UUID followingId;

    @Column(nullable = false)
    private Instant createdAt;

    protected Follow() {
    }

    public Follow(UUID followerId, UUID followingId) {
        this.followerId = followerId;
        this.followingId = followingId;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getFollowerId() {
        return followerId;
    }

    public UUID getFollowingId() {
        return followingId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
