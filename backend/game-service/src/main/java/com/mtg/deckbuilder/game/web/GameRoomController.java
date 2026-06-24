package com.mtg.deckbuilder.game.web;

import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.service.GameService;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Room lifecycle + state restore (used by clients to reconcile after a WS reconnect). */
@RestController
@RequestMapping("/api/game/rooms")
public class GameRoomController {

  private final GameService gameService;

  public GameRoomController(GameService gameService) {
    this.gameService = gameService;
  }

  @PostMapping
  public ResponseEntity<GameState> createRoom(
      @RequestHeader("X-User-Id") String userId,
      @RequestHeader(value = "X-User-Name", required = false) String userName,
      @RequestBody CreateRoomRequest request) {
    GameState state = gameService.createRoom(
        userId, userName,
        request.name() == null || request.name().isBlank() ? "Game" : request.name(),
        request.maxPlayers() == 0 ? 4 : request.maxPlayers(),
        request.deckId());
    return ResponseEntity.status(HttpStatus.CREATED).body(state);
  }

  @PostMapping("/{id}/join")
  public GameState joinRoom(
      @RequestHeader("X-User-Id") String userId,
      @RequestHeader(value = "X-User-Name", required = false) String userName,
      @PathVariable String id,
      @RequestBody(required = false) JoinRoomRequest request) {
    String deckId = request == null ? null : request.deckId();
    return gameService.joinRoom(id, userId, userName, deckId);
  }

  @GetMapping("/{id}")
  public GameState getRoom(@PathVariable String id) {
    return gameService.getState(id);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<String> notFound(IllegalArgumentException e) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<String> conflict(IllegalStateException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
  }

  public record CreateRoomRequest(@Size(max = 60) String name, int maxPlayers, String deckId) {
  }

  public record JoinRoomRequest(String deckId) {
  }
}
