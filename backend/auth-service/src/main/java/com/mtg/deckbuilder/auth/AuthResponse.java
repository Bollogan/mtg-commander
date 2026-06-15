package com.mtg.deckbuilder.auth;

import java.util.UUID;

public record AuthResponse(
    String token,
    String refreshToken,
    UUID userId,
    String email,
    String displayName
) {
    public static AuthResponse from(UserPrincipal principal, String token, String refreshToken, String displayName) {
        return new AuthResponse(token, refreshToken, principal.getId(), principal.getUsername(), displayName);
    }
}
