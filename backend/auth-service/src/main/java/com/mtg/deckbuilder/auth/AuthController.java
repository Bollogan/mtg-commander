package com.mtg.deckbuilder.auth;

import com.mtg.deckbuilder.user.UserEntity;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthenticationManager authenticationManager;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthController(AuthenticationManager authenticationManager,
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      JwtService jwtService) {
    this.authenticationManager = authenticationManager;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
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

    return ResponseEntity.ok(AuthResponse.from(principal, token, user.getDisplayName()));
  }

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(request.email(), request.password()));

    UserEntity user = userRepository.findByEmailIgnoreCase(request.email())
        .orElseThrow();
    UserPrincipal principal = new UserPrincipal(user);
    String token = jwtService.generateToken(principal);

    return ResponseEntity.ok(AuthResponse.from(principal, token, user.getDisplayName()));
  }
}
