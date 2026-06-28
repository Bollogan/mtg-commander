package com.mtg.deckbuilder.user.service;

import com.mtg.deckbuilder.user.domain.Profile;
import com.mtg.deckbuilder.user.repo.ProfileRepository;
import com.mtg.deckbuilder.user.web.NotFoundException;
import com.mtg.deckbuilder.user.web.dto.UpdateProfileRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final BadgeService badgeService;

    public ProfileService(ProfileRepository profileRepository, BadgeService badgeService) {
        this.profileRepository = profileRepository;
        this.badgeService = badgeService;
    }

    public Profile get(UUID id) {
        return profileRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Profile not found: " + id));
    }

    /**
     * Returns the profile for the authenticated user, lazily creating it on first access.
     * This keeps user-service decoupled from auth-service: a profile materialises the first
     * time a freshly registered user touches any user endpoint.
     */
    @Transactional
    public Profile ensureSelf(UUID id, String displayName) {
        return profileRepository.findById(id).orElseGet(() -> {
            Profile p = new Profile();
            p.setId(id);
            p.setDisplayName(StringUtils.hasText(displayName) ? displayName : "Planeswalker");
            return profileRepository.save(p);
        });
    }

    @Transactional
    public Profile update(UUID id, UpdateProfileRequest req) {
        Profile p = get(id);
        if (StringUtils.hasText(req.displayName())) {
            p.setDisplayName(req.displayName());
        }
        if (req.bio() != null) {
            p.setBio(req.bio());
        }
        if (req.avatarUrl() != null) {
            p.setAvatarUrl(req.avatarUrl());
        }
        if (req.country() != null) {
            p.setCountry(req.country());
        }
        return profileRepository.save(p);
    }

    /** Sets the deck count reported by deck-service and evaluates deck-based milestones. */
    @Transactional
    public Profile setDeckCount(UUID id, long deckCount) {
        Profile p = get(id);
        p.setDeckCount(deckCount);
        Profile saved = profileRepository.save(p);
        badgeService.evaluateDeckMilestones(id, deckCount);
        return saved;
    }

    public List<Profile> leaderboard(int limit) {
        return profileRepository
            .findAllByOrderByFollowerCountDescDeckCountDesc(PageRequest.of(0, Math.min(limit, 100)))
            .getContent();
    }
}
