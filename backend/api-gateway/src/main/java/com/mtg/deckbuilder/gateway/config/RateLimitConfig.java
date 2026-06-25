package com.mtg.deckbuilder.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

/**
 * Resolves the rate-limit bucket key from the client IP, so the {@code RequestRateLimiter}
 * (Redis token bucket) throttles per source address (max ~20 req/s, see application.yml).
 */
@Configuration
public class RateLimitConfig {

    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            var remote = exchange.getRequest().getRemoteAddress();
            String ip = remote != null && remote.getAddress() != null
                ? remote.getAddress().getHostAddress()
                : "unknown";
            return Mono.just(ip);
        };
    }
}
