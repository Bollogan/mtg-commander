package com.mtg.deckbuilder.game.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP over WebSocket. Clients connect to {@code /ws/game}, send actions to
 * {@code /app/game.{roomId}.action} and subscribe to {@code /topic/game.{roomId}} for
 * broadcasts. Uses the in-memory simple broker (single-node MVP); Redis remains the
 * source of truth for state so reconnects can fully reconcile.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

  @Override
  public void configureMessageBroker(MessageBrokerRegistry registry) {
    registry.enableSimpleBroker("/topic");
    registry.setApplicationDestinationPrefixes("/app");
  }

  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    registry.addEndpoint("/ws/game")
        .setAllowedOriginPatterns("*");
    // Native WebSocket endpoint (no SockJS) keeps the client dependency-light and works
    // through the gateway's ws:// passthrough.
  }
}
