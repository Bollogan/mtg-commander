package com.mtg.deckbuilder.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey signingKey;
  private final long expirationMillis;

  public JwtService(@Value("${security.jwt.secret}") String secret,
      @Value("${security.jwt.expiration-ms:86400000}") long expirationMillis) {
    this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    this.expirationMillis = expirationMillis;
  }

  public String generateToken(UserPrincipal principal) {
    Instant now = Instant.now();
    return Jwts.builder()
        .setSubject(principal.getUsername())
        .claim("uid", principal.getId().toString())
        .setIssuedAt(Date.from(now))
        .setExpiration(Date.from(now.plusMillis(expirationMillis)))
        .signWith(signingKey, SignatureAlgorithm.HS256)
        .compact();
  }

  public String extractUsername(String token) {
    return parseClaims(token).getSubject();
  }

  public boolean isTokenValid(String token, UserPrincipal principal) {
    String username = extractUsername(token);
    return username.equals(principal.getUsername()) && !isTokenExpired(token);
  }

  private boolean isTokenExpired(String token) {
    Date expiration = parseClaims(token).getExpiration();
    return expiration.before(new Date());
  }

  private Claims parseClaims(String token) {
    return Jwts.parser()
        .verifyWith(signingKey)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
