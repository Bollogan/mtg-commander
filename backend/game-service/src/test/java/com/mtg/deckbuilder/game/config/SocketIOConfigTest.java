package com.mtg.deckbuilder.game.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.corundumstudio.socketio.AuthorizationListener;
import com.corundumstudio.socketio.HandshakeData;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.netty.handler.codec.http.DefaultHttpHeaders;
import java.net.InetSocketAddress;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Guards the two-phase socket.io auth. netty-socketio calls the {@link AuthorizationListener} on
 * the transport handshake, <i>before</i> the CONNECT packet that carries the browser's
 * {@code auth: { token }} — at that point {@code getAuthToken()} is an empty map. Rejecting there
 * on a missing token refused every browser client, so a tokenless handshake must pass through and
 * be judged later by the AuthTokenListener.
 */
class SocketIOConfigTest {

  private static final String SECRET =
      "SGVsbG8gV29ybGQgVGhpcyBpcyBhIFNlY3JldCBLZXkgZm9yIEpXVCBFbmNvZGluZw==";

  private final AuthorizationListener listener = new SocketIOConfig()
      .socketIOServer(0, new SocketIoJwtVerifier(SECRET))
      .getConfiguration()
      .getAuthorizationListener();

  private static String validToken() {
    return Jwts.builder().subject("alice").claim("uid", "u1")
        .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET))).compact();
  }

  /** A handshake as netty-socketio builds it: auth payload still empty, only url params known. */
  private static HandshakeData handshake(Map<String, List<String>> urlParams) {
    HandshakeData data = new HandshakeData(new DefaultHttpHeaders(), urlParams,
        new InetSocketAddress("127.0.0.1", 1234), "/socket.io/", false);
    data.setAuthToken(Collections.emptyMap());
    return data;
  }

  @Test
  void tokenlessHandshakeIsDeferredToTheConnectPacket() {
    assertThat(listener.getAuthorizationResult(handshake(Collections.emptyMap())).isAuthorized())
        .isTrue();
  }

  @Test
  void validQueryTokenIsAuthorized() {
    HandshakeData data = handshake(Map.of("token", List.of(validToken())));

    assertThat(listener.getAuthorizationResult(data).isAuthorized()).isTrue();
  }

  @Test
  void invalidQueryTokenIsRejected() {
    HandshakeData data = handshake(Map.of("token", List.of("not-a-jwt")));

    assertThat(listener.getAuthorizationResult(data).isAuthorized()).isFalse();
  }
}
