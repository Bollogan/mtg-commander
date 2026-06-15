package com.mtg.deckbuilder.user.service;

import com.mtg.deckbuilder.user.domain.Follow;
import com.mtg.deckbuilder.user.domain.Profile;
import com.mtg.deckbuilder.user.notify.NotificationMessage;
import com.mtg.deckbuilder.user.notify.NotificationPublisher;
import com.mtg.deckbuilder.user.repo.FollowRepository;
import com.mtg.deckbuilder.user.repo.ProfileRepository;
import com.mtg.deckbuilder.user.web.NotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FollowService {

    private final FollowRepository followRepository;
    private final ProfileRepository profileRepository;
    private final BadgeService badgeService;
    private final NotificationPublisher notifications;

    public FollowService(FollowRepository followRepository,
                         ProfileRepository profileRepository,
                         BadgeService badgeService,
                         NotificationPublisher notifications) {
        this.followRepository = followRepository;
        this.profileRepository = profileRepository;
        this.badgeService = badgeService;
        this.notifications = notifications;
    }

    public boolean isFollowing(UUID followerId, UUID followingId) {
        return followRepository.existsByFollowerIdAndFollowingId(followerId, followingId);
    }

    /** Creates a follow edge (idempotent), maintains denormalised counters, awards milestone badges. */
    @Transactional
    public Profile follow(UUID followerId, UUID followingId) {
        if (followerId.equals(followingId)) {
            throw new IllegalArgumentException("A user cannot follow themselves");
        }
        Profile target = profileRepository.findById(followingId)
            .orElseThrow(() -> new NotFoundException("Profile not found: " + followingId));
        Profile follower = profileRepository.findById(followerId)
            .orElseThrow(() -> new NotFoundException("Profile not found: " + followerId));

        if (followRepository.existsByFollowerIdAndFollowingId(followerId, followingId)) {
            return target;
        }

        followRepository.save(new Follow(followerId, followingId));
        target.setFollowerCount(target.getFollowerCount() + 1);
        follower.setFollowingCount(follower.getFollowingCount() + 1);
        profileRepository.save(follower);
        Profile saved = profileRepository.save(target);

        badgeService.evaluateFollowerMilestones(followingId, saved.getFollowerCount());
        notifications.publish(NotificationMessage.of(
            "NEW_FOLLOWER", followingId, followerId,
            follower.getDisplayName() + " started following you"));
        return saved;
    }

    /** Removes a follow edge if present (idempotent) and decrements counters. */
    @Transactional
    public Profile unfollow(UUID followerId, UUID followingId) {
        Profile target = profileRepository.findById(followingId)
            .orElseThrow(() -> new NotFoundException("Profile not found: " + followingId));
        followRepository.findByFollowerIdAndFollowingId(followerId, followingId)
            .ifPresent(edge -> {
                followRepository.delete(edge);
                target.setFollowerCount(Math.max(0, target.getFollowerCount() - 1));
                profileRepository.findById(followerId).ifPresent(f -> {
                    f.setFollowingCount(Math.max(0, f.getFollowingCount() - 1));
                    profileRepository.save(f);
                });
                profileRepository.save(target);
            });
        return target;
    }

    public List<UUID> followingIds(UUID followerId) {
        return followRepository.findByFollowerId(followerId).stream()
            .map(Follow::getFollowingId)
            .toList();
    }

    public List<UUID> followerIds(UUID followingId) {
        return followRepository.findByFollowingId(followingId).stream()
            .map(Follow::getFollowerId)
            .toList();
    }
}
