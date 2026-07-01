package com.mtg.deckbuilder.game.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Verifies the JWT presented on the socket.io handshake, using the same signing secret as the
 * gateway/auth-service. Mirrors the gateway's {@code JwtAuthenticationFilter} parsing so the
 * socket connection trusts the same identity claims (uid = playerId, sub = username).
 */
@Component
public class SocketIoJwtVerifier {

  private static final Logger log = LoggerFactory.getLogger(SocketIoJwtVerifier.class);

  private final SecretKey signingKey;

  public SocketIoJwtVerifier(@Value("${security.jwt.secret}") String secret) {
    this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
  }

  /** Returns the token claims if the JWT is present and valid, otherwise empty. */
  public Optional<Claims> verify(String token) {
    if (token == null || token.isBlank()) {
      return Optional.empty();
    }
    String raw = token.startsWith("Bearer ") ? token.substring(7) : token;
    try {
      Claims claims = Jwts.parser()
          .verifyWith(signingKey)
          .build()
          .parseSignedClaims(raw)
          .getPayload();
      return Optional.of(claims);
    } catch (Exception e) {
      log.warn("socket.io handshake JWT rejected: {}", e.getMessage());
      return Optional.empty();
    }
  }
}
