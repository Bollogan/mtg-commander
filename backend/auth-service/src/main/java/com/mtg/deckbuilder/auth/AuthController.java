package com.mtg.deckbuilder.auth;

import com.mtg.deckbuilder.user.UserEntity;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final long refreshExpirationMs;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService,
                          RefreshTokenRepository refreshTokenRepository,
                          @Value("${security.jwt.refresh-expiration-ms:604800000}") long refreshExpirationMs) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        UserEntity user = new UserEntity();
        user.setEmail(request.email());
        user.setDisplayName(request.displayName());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtService.generateToken(principal);
        String refreshToken = createRefreshToken(user.getId());

        return ResponseEntity.ok(AuthResponse.from(principal, token, refreshToken, user.getDisplayName()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        UserEntity user = userRepository.findByEmailIgnoreCase(request.email()).orElseThrow();
        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtService.generateToken(principal);
        String refreshToken = createRefreshToken(user.getId());

        return ResponseEntity.ok(AuthResponse.from(principal, token, refreshToken, user.getDisplayName()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        RefreshToken stored = refreshTokenRepository.findByToken(request.refreshToken())
            .orElse(null);

        if (stored == null || stored.isExpired()) {
            if (stored != null) {
                refreshTokenRepository.delete(stored);
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UserEntity user = userRepository.findById(stored.getUserId()).orElse(null);
        if (user == null) {
            refreshTokenRepository.delete(stored);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Rotate refresh token
        refreshTokenRepository.delete(stored);
        String newRefreshToken = createRefreshToken(user.getId());
        UserPrincipal principal = new UserPrincipal(user);
        String newToken = jwtService.generateToken(principal);

        return ResponseEntity.ok(AuthResponse.from(principal, newToken, newRefreshToken, user.getDisplayName()));
    }

    private String createRefreshToken(UUID userId) {
        RefreshToken rt = new RefreshToken();
        rt.setToken(UUID.randomUUID().toString());
        rt.setUserId(userId);
        rt.setExpiresAt(Instant.now().plusMillis(refreshExpirationMs));
        return refreshTokenRepository.save(rt).getToken();
    }
}
