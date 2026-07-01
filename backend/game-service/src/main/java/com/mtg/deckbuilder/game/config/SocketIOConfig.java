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
 * {@code /socket.io/**} to. Auth is enforced at the handshake: the client sends the JWT via
 * socket.io's {@code auth: { token }} (or {@code ?token=} query), and we reject the connection
 * unless it verifies against the shared secret. Listeners are registered + the server started
 * by {@code GameSocketHandler} (a SmartLifecycle) so wiring is complete before it binds.
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
    // Origin is checked upstream (gateway CORS) and may be stripped; the JWT handshake is the gate.
    config.setOrigin(null);

    // Register Jackson modules so java.time + Optional + records (e.g. GameAction) (de)serialize.
    config.setJsonSupport(new JacksonJsonSupport(
        new ParameterNamesModule(), new Jdk8Module(), new JavaTimeModule()));

    config.setAuthorizationListener(new AuthorizationListener() {
      @Override
      public AuthorizationResult getAuthorizationResult(HandshakeData data) {
        return jwtVerifier.verify(extractToken(data)).isPresent()
            ? AuthorizationResult.SUCCESSFUL_AUTHORIZATION
            : AuthorizationResult.FAILED_AUTHORIZATION;
      }
    });

    return new SocketIOServer(config);
  }

  /** Reads the JWT from the socket.io {@code auth} payload, falling back to a {@code ?token=} query. */
  public static String extractToken(HandshakeData data) {
    Object auth = data.getAuthToken();
    if (auth instanceof Map<?, ?> map) {
      Object token = map.get("token");
      if (token != null) {
        return token.toString();
      }
    }
    return data.getSingleUrlParam("token");
  }
}
