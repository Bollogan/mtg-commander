package com.mtg.deckbuilder.user.rgpd;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** RGPD endpoints for the authenticated user (data portability + erasure). */
@RestController
@RequestMapping("/api/users/me")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    /** Data portability: returns all of the caller's data as JSON (Art. 20 GDPR). */
    @GetMapping("/export")
    public UserDataExport export(@RequestHeader("X-User-Id") UUID userId) {
        return accountService.export(userId);
    }

    /** Right to erasure: deletes the caller's account and fans out a purge (Art. 17 GDPR). */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMe(@RequestHeader("X-User-Id") UUID userId) {
        accountService.deleteAccount(userId);
    }
}
