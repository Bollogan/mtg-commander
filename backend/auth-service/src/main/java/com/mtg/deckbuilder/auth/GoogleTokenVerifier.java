package com.mtg.deckbuilder.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.util.Collections;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Verifies Google Sign-In ID tokens against the configured OAuth client id. Returns the verified
 * identity, or {@code null} when the token is invalid or the feature is not configured.
 */
@Service
public class GoogleTokenVerifier {

  private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);

  private final GoogleIdTokenVerifier verifier;
  private final boolean enabled;

  public GoogleTokenVerifier(@Value("${google.client-id:}") String clientId) {
    this.enabled = clientId != null && !clientId.isBlank();
    this.verifier = enabled
        ? new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
            .setAudience(Collections.singletonList(clientId))
            .build()
        : null;
  }

  /** A verified Google identity. */
  public record GoogleUser(String email, String name, String subject) {
  }

  public GoogleUser verify(String idTokenString) {
    if (!enabled) {
      log.warn("Google sign-in attempted but GOOGLE_CLIENT_ID is not configured");
      return null;
    }
    try {
      GoogleIdToken idToken = verifier.verify(idTokenString);
      if (idToken == null) {
        return null;
      }
      Payload payload = idToken.getPayload();
      if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
        return null;
      }
      String name = (String) payload.get("name");
      return new GoogleUser(payload.getEmail(), name, payload.getSubject());
    } catch (Exception e) {
      log.warn("Google ID token verification failed: {}", e.getMessage());
      return null;
    }
  }
}
