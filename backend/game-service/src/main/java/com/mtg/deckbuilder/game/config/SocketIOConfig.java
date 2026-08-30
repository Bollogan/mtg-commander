package com.mtg.deckbuilder.game.config;

import com.corundumstudio.socketio.AuthorizationListener;
import com.corundumstudio.socketio.AuthorizationResult;
import com.corundumstudio.socketio.HandshakeData;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.protocol.JacksonJsonSupport;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Builds the standalone {@link SocketIOServer} (netty-socketio) that the gateway proxies
 * {@code /socket.io/**} to.
 *
 * <p><b>Auth is two-phase</b>, because socket.io v4 splits it that way and netty-socketio follows
 * suit:
 * <ol>
 *   <li><i>Transport handshake</i> — the {@link AuthorizationListener} below. At this point
 *       netty-socketio has NOT received the socket.io CONNECT packet yet, so
 *       {@link HandshakeData#getAuthToken()} is still an empty map: only a {@code ?token=} query
 *       param (or {@code Authorization} header) can be seen here. We therefore reject only a token
 *       that is present <i>and</i> invalid, and let a tokenless handshake through.</li>
 *   <li><i>CONNECT packet</i> — the {@code AuthTokenListener} registered by
 *       {@code GameSocketHandler}, which is where the browser's {@code auth: { token }} actually
 *       arrives. That is the gate that really admits or drops the client.</li>
 * </ol>
 * Rejecting at phase 1 on a missing token (as this class used to) refused every browser client,
 * since browsers can only send the JWT via {@code auth}.
 *
 * <p>Listeners are registered + the server started by {@code GameSocketHandler} (a SmartLifecycle)
 * so wiring is complete before it binds.
 */
@Configuration
public class SocketIOConfig {

  @Bean
  public SocketIOServer socketIOServer(
      @Value("${game.socketio.port:9092}") int port,
      SocketIoJwtVerifier jwtVerifier) {

    com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
    config.setHostname("0.0.0.0");
    config.setPort(port);
    // Origin is checked upstream (gateway CORS) and may be stripped; the JWT is the gate.
    config.setOrigin(null);

    // Register Jackson modules so java.time + Optional + records (e.g. GameAction) (de)serialize.
    config.setJsonSupport(new JacksonJsonSupport(
        new ParameterNamesModule(), new Jdk8Module(), new JavaTimeModule()));

    config.setAuthorizationListener(new AuthorizationListener() {
      @Override
      public AuthorizationResult getAuthorizationResult(HandshakeData data) {
        String token = extractToken(data);
        if (token == null || token.isBlank()) {
          // No token visible yet — defer to the CONNECT-packet AuthTokenListener.
          return AuthorizationResult.SUCCESSFUL_AUTHORIZATION;
        }
        return jwtVerifier.verify(token).isPresent()
            ? AuthorizationResult.SUCCESSFUL_AUTHORIZATION
            : AuthorizationResult.FAILED_AUTHORIZATION;
      }
    });

    return new SocketIOServer(config);
  }

  /**
   * Reads the JWT from the socket.io {@code auth} payload (populated once the CONNECT packet has
   * been decoded), falling back to a {@code ?token=} query param and then the {@code Authorization}
   * header (usable by the polling transport, which browsers do let you set headers on).
   */
  public static String extractToken(HandshakeData data) {
    Object auth = data.getAuthToken();
    if (auth instanceof Map<?, ?> map) {
      Object token = map.get("token");
      if (token != null) {
        return token.toString();
      }
    }
    String queryToken = data.getSingleUrlParam("token");
    if (queryToken != null && !queryToken.isBlank()) {
      return queryToken;
    }
    return data.getHttpHeaders() == null ? null : data.getHttpHeaders().get("Authorization");
  }

  /** Reads the JWT out of the raw {@code auth} payload handed to an {@code AuthTokenListener}. */
  public static String tokenFromAuthData(Object authData) {
    if (authData instanceof Map<?, ?> map) {
      Object token = map.get("token");
      return token == null ? null : token.toString();
    }
    return authData == null ? null : authData.toString();
  }
}
