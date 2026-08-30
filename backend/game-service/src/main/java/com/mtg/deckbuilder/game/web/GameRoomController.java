package com.mtg.deckbuilder.game.web;

import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.domain.RoomSummary;
import com.mtg.deckbuilder.game.service.GameService;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Room lifecycle over REST: create, browse the open lobbies, join by invite code, and restore
 * state (used to reconcile after a socket reconnect). Everything that happens *inside* a room
 * once you are in it — ready, deck, start, chat, moderation — travels over socket.io instead,
 * so every member sees it at once.
 *
 * <p>Every state returned here is {@link GameState#redactedFor(String)} the caller: hands and
 * libraries never leave the service for someone not entitled to them.
 */
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
        request.deckId(),
        request.publicRoom());
    return ResponseEntity.status(HttpStatus.CREATED).body(state.redactedFor(userId));
  }

  /** Open, public lobbies anyone may drop into. */
  @GetMapping
  public List<RoomSummary> publicLobbies() {
    return gameService.publicLobbies();
  }

  @PostMapping("/{id}/join")
  public GameState joinRoom(
      @RequestHeader("X-User-Id") String userId,
      @RequestHeader(value = "X-User-Name", required = false) String userName,
      @PathVariable String id,
      @RequestBody(required = false) JoinRoomRequest request) {
    String deckId = request == null ? null : request.deckId();
    return gameService.joinRoom(id, userId, userName, deckId).redactedFor(userId);
  }

  @GetMapping("/{id}")
  public GameState getRoom(@RequestHeader("X-User-Id") String userId, @PathVariable String id) {
    return gameService.getState(id).redactedFor(userId);
  }

  /** Leaves the room. Mid-game the seat is kept for a reconnect; in the lobby it is freed. */
  @DeleteMapping("/{id}/members/me")
  public ResponseEntity<GameState> leaveRoom(
      @RequestHeader("X-User-Id") String userId, @PathVariable String id) {
    GameState state = gameService.leave(id, userId);
    return state == null
        ? ResponseEntity.noContent().build()
        : ResponseEntity.ok(state.redactedFor(userId));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<String> notFound(IllegalArgumentException e) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<String> conflict(IllegalStateException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
  }

  public record CreateRoomRequest(@Size(max = 60) String name, int maxPlayers, String deckId,
                                  boolean publicRoom) {
  }

  public record JoinRoomRequest(String deckId) {
  }
}
