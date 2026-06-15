package com.mtg.deckbuilder.user.web;

import com.mtg.deckbuilder.user.domain.Profile;
import com.mtg.deckbuilder.user.service.ProfileService;
import com.mtg.deckbuilder.user.web.dto.ProfileDto;
import com.mtg.deckbuilder.user.web.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    /** Provisions (or returns) the profile of the authenticated caller. */
    @PostMapping("/me")
    public ProfileDto ensureSelf(@RequestHeader("X-User-Id") UUID userId,
                                 @RequestHeader(value = "X-User-Name", required = false) String userName) {
        return ProfileDto.from(profileService.ensureSelf(userId, userName));
    }

    @GetMapping("/me")
    public ProfileDto me(@RequestHeader("X-User-Id") UUID userId,
                         @RequestHeader(value = "X-User-Name", required = false) String userName) {
        return ProfileDto.from(profileService.ensureSelf(userId, userName));
    }

    @GetMapping("/leaderboard")
    public List<ProfileDto> leaderboard(@RequestParam(defaultValue = "20") int limit) {
        return profileService.leaderboard(limit).stream().map(ProfileDto::from).toList();
    }

    @GetMapping("/{id}")
    public ProfileDto get(@PathVariable UUID id) {
        return ProfileDto.from(profileService.get(id));
    }

    @PutMapping("/{id}")
    public ProfileDto update(@PathVariable UUID id,
                             @RequestHeader("X-User-Id") UUID userId,
                             @Valid @RequestBody UpdateProfileRequest request) {
        if (!id.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot edit another user's profile");
        }
        return ProfileDto.from(profileService.update(id, request));
    }

    /** Internal endpoint: deck-service reports a profile's deck count to drive badges/leaderboard. */
    @PutMapping("/{id}/deck-count")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setDeckCount(@PathVariable UUID id, @RequestParam long value) {
        profileService.setDeckCount(id, value);
    }
}
