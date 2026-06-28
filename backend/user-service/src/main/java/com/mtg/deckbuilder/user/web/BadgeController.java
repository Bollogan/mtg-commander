package com.mtg.deckbuilder.user.web;

import com.mtg.deckbuilder.user.service.BadgeService;
import com.mtg.deckbuilder.user.web.dto.BadgeDto;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class BadgeController {

    private final BadgeService badgeService;

    public BadgeController(BadgeService badgeService) {
        this.badgeService = badgeService;
    }

    @GetMapping("/{id}/badges")
    public List<BadgeDto> badges(@PathVariable UUID id) {
        return badgeService.badgesFor(id).stream().map(BadgeDto::from).toList();
    }
}
