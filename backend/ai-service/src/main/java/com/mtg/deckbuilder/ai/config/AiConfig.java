package com.mtg.deckbuilder.ai.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class AiConfig {

  /**
   * RestClient for the external community AI model, with a hard {@code timeout-ms} read
   * timeout so a slow model can never block longer than the SLA before we fall back.
   */
  @Bean
  RestClient externalAiRestClient(
      @Value("${ai.external.url}") String baseUrl,
      @Value("${ai.external.timeout-ms:3000}") int timeoutMs) {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout((int) Duration.ofMillis(timeoutMs).toMillis());
    factory.setReadTimeout((int) Duration.ofMillis(timeoutMs).toMillis());
    return RestClient.builder()
        .baseUrl(baseUrl)
        .requestFactory(factory)
        .build();
  }
}
