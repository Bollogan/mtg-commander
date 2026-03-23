package com.mtg.deckbuilder.auth;

import java.util.UUID;

public record AuthResponse(
    String token,
    UUID userId,
    String email,
    String displayName
) {
  public static AuthResponse from(UserPrincipal principal, String token, String displayName) {
    return new AuthResponse(token, principal.getId(), principal.getUsername(), displayName);
  }
}
