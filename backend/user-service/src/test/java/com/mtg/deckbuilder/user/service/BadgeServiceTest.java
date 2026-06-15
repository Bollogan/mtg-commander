package com.mtg.deckbuilder.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mtg.deckbuilder.user.domain.Badge;
import com.mtg.deckbuilder.user.domain.BadgeType;
import com.mtg.deckbuilder.user.notify.NotificationPublisher;
import com.mtg.deckbuilder.user.repo.BadgeRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BadgeServiceTest {

    @Mock BadgeRepository badgeRepository;
    @Mock NotificationPublisher notifications;
    @InjectMocks BadgeService badgeService;

    @Test
    void awardsBadgeOnceAndNotifies() {
        UUID profile = UUID.randomUUID();
        when(badgeRepository.existsByProfileIdAndType(profile, BadgeType.FIRST_FOLLOWER)).thenReturn(false);

        boolean awarded = badgeService.award(profile, BadgeType.FIRST_FOLLOWER);

        assertThat(awarded).isTrue();
        verify(badgeRepository).save(any(Badge.class));
        verify(notifications).publish(any());
    }

    @Test
    void doesNotReAwardExistingBadge() {
        UUID profile = UUID.randomUUID();
        when(badgeRepository.existsByProfileIdAndType(profile, BadgeType.TEN_FOLLOWERS)).thenReturn(true);

        boolean awarded = badgeService.award(profile, BadgeType.TEN_FOLLOWERS);

        assertThat(awarded).isFalse();
        verify(badgeRepository, never()).save(any());
        verify(notifications, never()).publish(any());
    }

    @Test
    void followerMilestonesAwardFirstAndTenAtTen() {
        UUID profile = UUID.randomUUID();
        when(badgeRepository.existsByProfileIdAndType(any(), any())).thenReturn(false);

        badgeService.evaluateFollowerMilestones(profile, 10);

        // FIRST_FOLLOWER (>=1) and TEN_FOLLOWERS (>=10) awarded; HUNDRED (>=100) not.
        verify(badgeRepository, times(2)).save(any(Badge.class));
    }
}
