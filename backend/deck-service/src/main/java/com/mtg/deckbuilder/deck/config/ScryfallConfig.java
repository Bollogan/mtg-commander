package com.mtg.deckbuilder.deck.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class ScryfallConfig {

  @Bean
  WebClient scryfallWebClient(
      WebClient.Builder builder,
      @Value("${scryfall.base-url}") String baseUrl,
      @Value("${scryfall.user-agent}") String userAgent) {
    // Scryfall "unique=prints" searches (e.g. Sol Ring has 100+ printings) can exceed the
    // default 256KB reactive buffer, so raise the in-memory limit to 8MB.
    var strategies = org.springframework.web.reactive.function.client.ExchangeStrategies.builder()
        .codecs(c -> c.defaultCodecs().maxInMemorySize(8 * 1024 * 1024))
        .build();
    return builder
        .baseUrl(baseUrl)
        .exchangeStrategies(strategies)
        .defaultHeader(HttpHeaders.USER_AGENT, userAgent)
        .defaultHeader(HttpHeaders.ACCEPT, "application/json")
        .build();
  }
}
