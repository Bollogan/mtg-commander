package com.mtg.deckbuilder.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * An achievement awarded to a profile. A profile can hold each {@link BadgeType} once.
 */
@Entity
@Table(
    name = "badges",
    uniqueConstraints = @UniqueConstraint(columnNames = {"profileId", "type"}))
public class Badge {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false)
    private UUID profileId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BadgeType type;

    @Column(nullable = false)
    private Instant awardedAt;

    protected Badge() {
    }

    public Badge(UUID profileId, BadgeType type) {
        this.profileId = profileId;
        this.type = type;
    }

    @PrePersist
    void onCreate() {
        awardedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getProfileId() {
        return profileId;
    }

    public BadgeType getType() {
        return type;
    }

    public Instant getAwardedAt() {
        return awardedAt;
    }
}
