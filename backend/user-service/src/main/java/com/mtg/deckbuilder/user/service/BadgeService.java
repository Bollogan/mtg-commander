package com.mtg.deckbuilder.user.service;

import com.mtg.deckbuilder.user.domain.Badge;
import com.mtg.deckbuilder.user.domain.BadgeType;
import com.mtg.deckbuilder.user.notify.NotificationMessage;
import com.mtg.deckbuilder.user.notify.NotificationPublisher;
import com.mtg.deckbuilder.user.repo.BadgeRepository;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owns badge persistence and the milestone rules that award them automatically.
 */
@Service
public class BadgeService {

    private static final Logger log = LoggerFactory.getLogger(BadgeService.class);

    private final BadgeRepository badgeRepository;
    private final NotificationPublisher notifications;

    public BadgeService(BadgeRepository badgeRepository, NotificationPublisher notifications) {
        this.badgeRepository = badgeRepository;
        this.notifications = notifications;
    }

    public List<Badge> badgesFor(UUID profileId) {
        return badgeRepository.findByProfileIdOrderByAwardedAtDesc(profileId);
    }

    /** Awards a badge once; no-op if the profile already holds it. Returns true if newly awarded. */
    @Transactional
    public boolean award(UUID profileId, BadgeType type) {
        if (badgeRepository.existsByProfileIdAndType(profileId, type)) {
            return false;
        }
        badgeRepository.save(new Badge(profileId, type));
        log.info("Awarded badge {} to {}", type, profileId);
        notifications.publish(NotificationMessage.of(
            "BADGE_AWARDED", profileId, null, "You earned the \"" + type.getLabel() + "\" badge!"));
        return true;
    }

    /** Evaluates follower-count milestones for a profile and awards any newly reached badge. */
    @Transactional
    public void evaluateFollowerMilestones(UUID profileId, long followerCount) {
        if (followerCount >= 1) {
            award(profileId, BadgeType.FIRST_FOLLOWER);
        }
        if (followerCount >= 10) {
            award(profileId, BadgeType.TEN_FOLLOWERS);
        }
        if (followerCount >= 100) {
            award(profileId, BadgeType.HUNDRED_FOLLOWERS);
        }
    }

    /** Awards the first-deck badge. Invoked when deck-service reports a profile's deck count. */
    @Transactional
    public void evaluateDeckMilestones(UUID profileId, long deckCount) {
        if (deckCount >= 1) {
            award(profileId, BadgeType.FIRST_DECK);
        }
    }
}
