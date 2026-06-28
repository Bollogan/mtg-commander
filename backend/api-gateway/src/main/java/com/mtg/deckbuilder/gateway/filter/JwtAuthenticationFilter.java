package com.mtg.deckbuilder.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.util.List;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private static final List<String> PUBLIC_PATHS = List.of(
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/refresh",
        "/actuator",
        // STOMP WebSocket handshake: auth is handled at room-join (REST) time; the
        // upgrade request cannot carry the bearer header reliably across browsers.
        "/ws/game",
        // Public card catalogue (Scryfall proxy): the landing page browses cards
        // without logging in, so card search/lookup must be reachable anonymously.
        "/api/scryfall"
    );

    private final SecretKey signingKey;

    public JwtAuthenticationFilter(@Value("${security.jwt.secret}") String secret) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (exchange.getRequest().getMethod() == HttpMethod.OPTIONS) {
            return chain.filter(exchange);
        }

        String path = exchange.getRequest().getURI().getPath();
        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return respondUnauthorized(exchange);
        }

        try {
            String token = authHeader.substring(7);
            Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

            String userId = claims.get("uid", String.class);
            String username = claims.getSubject();

            ServerHttpRequest mutated = exchange.getRequest().mutate()
                .header("X-User-Id", userId)
                .header("X-User-Name", username)
                .build();

            return chain.filter(exchange.mutate().request(mutated).build());
        } catch (Exception e) {
            log.warn("JWT rejected for {}: {}", path, e.getMessage());
            return respondUnauthorized(exchange);
        }
    }

    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    private Mono<Void> respondUnauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
