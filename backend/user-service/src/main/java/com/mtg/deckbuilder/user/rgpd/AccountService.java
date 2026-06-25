package com.mtg.deckbuilder.user.rgpd;

import com.mtg.deckbuilder.user.domain.Follow;
import com.mtg.deckbuilder.user.notify.UserEventPublisher;
import com.mtg.deckbuilder.user.repo.BadgeRepository;
import com.mtg.deckbuilder.user.repo.FollowRepository;
import com.mtg.deckbuilder.user.repo.ProfileRepository;
import com.mtg.deckbuilder.user.web.NotFoundException;
import com.mtg.deckbuilder.user.web.dto.BadgeDto;
import com.mtg.deckbuilder.user.web.dto.ProfileDto;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** RGPD operations: data portability (export) and right-to-erasure (delete). */
@Service
public class AccountService {

    private static final Logger log = LoggerFactory.getLogger(AccountService.class);

    private final ProfileRepository profileRepository;
    private final FollowRepository followRepository;
    private final BadgeRepository badgeRepository;
    private final UserEventPublisher eventPublisher;
    private final DeckExportClient deckExportClient;

    public AccountService(ProfileRepository profileRepository,
                          FollowRepository followRepository,
                          BadgeRepository badgeRepository,
                          UserEventPublisher eventPublisher,
                          DeckExportClient deckExportClient) {
        this.profileRepository = profileRepository;
        this.followRepository = followRepository;
        this.badgeRepository = badgeRepository;
        this.eventPublisher = eventPublisher;
        this.deckExportClient = deckExportClient;
    }

    @Transactional(readOnly = true)
    public UserDataExport export(UUID userId) {
        ProfileDto profile = profileRepository.findById(userId)
            .map(ProfileDto::from)
            .orElseThrow(() -> new NotFoundException("Profile not found: " + userId));

        List<UUID> following = followRepository.findByFollowerId(userId).stream()
            .map(Follow::getFollowingId).toList();
        List<UUID> followers = followRepository.findByFollowingId(userId).stream()
            .map(Follow::getFollowerId).toList();
        List<BadgeDto> badges = badgeRepository.findByProfileIdOrderByAwardedAtDesc(userId).stream()
            .map(BadgeDto::from).toList();

        List<DeckExportClient.DeckSummary> decks = List.of();
        try {
            decks = deckExportClient.myDecks(userId);
        } catch (RuntimeException e) {
            log.warn("Deck export unavailable for {}: {}", userId, e.getMessage());
        }

        return new UserDataExport(Instant.now(), profile, following, followers, badges, decks);
    }

    /**
     * Erases the user's own user-service data, then publishes {@code USER_DELETED} so every
     * other service purges its records — avoiding orphans across PostgreSQL and MongoDB.
     */
    @Transactional
    public void deleteAccount(UUID userId) {
        badgeRepository.deleteByProfileId(userId);
        followRepository.deleteByFollowerId(userId);
        followRepository.deleteByFollowingId(userId);
        profileRepository.findById(userId).ifPresent(profileRepository::delete);
        eventPublisher.publishUserDeleted(userId);
        log.info("Deleted user-service data for {} and published USER_DELETED", userId);
    }
}
