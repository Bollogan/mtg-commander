package com.mtg.deckbuilder.game.config;

import static org.assertj.core.api.Assertions.assertThat;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;

class SocketIoJwtVerifierTest {

  private static final String SECRET =
      "SGVsbG8gV29ybGQgVGhpcyBpcyBhIFNlY3JldCBLZXkgZm9yIEpXVCBFbmNvZGluZw==";
  private final SocketIoJwtVerifier verifier = new SocketIoJwtVerifier(SECRET);

  private static String tokenSignedWith(SecretKey key) {
    return Jwts.builder().subject("alice").claim("uid", "u1").signWith(key).compact();
  }

  @Test
  void validTokenIsAcceptedAndExposesClaims() {
    String token = tokenSignedWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET)));

    assertThat(verifier.verify(token)).isPresent();
    assertThat(verifier.verify(token).orElseThrow().get("uid", String.class)).isEqualTo("u1");
    // A "Bearer " prefix is tolerated (parity with the gateway filter).
    assertThat(verifier.verify("Bearer " + token)).isPresent();
  }

  @Test
  void missingOrMalformedTokenIsRejected() {
    assertThat(verifier.verify(null)).isEmpty();
    assertThat(verifier.verify("")).isEmpty();
    assertThat(verifier.verify("not-a-jwt")).isEmpty();
  }

  @Test
  void tokenSignedWithAnotherKeyIsRejected() {
    SecretKey wrongKey = Keys.hmacShaKeyFor(
        "a-different-secret-key-that-is-long-enough-256bits".getBytes(StandardCharsets.UTF_8));

    assertThat(verifier.verify(tokenSignedWith(wrongKey))).isEmpty();
  }
}
