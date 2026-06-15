package com.mtg.deckbuilder.user.repo;

import com.mtg.deckbuilder.user.domain.Badge;
import com.mtg.deckbuilder.user.domain.BadgeType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BadgeRepository extends JpaRepository<Badge, UUID> {

    List<Badge> findByProfileIdOrderByAwardedAtDesc(UUID profileId);

    boolean existsByProfileIdAndType(UUID profileId, BadgeType type);
}
