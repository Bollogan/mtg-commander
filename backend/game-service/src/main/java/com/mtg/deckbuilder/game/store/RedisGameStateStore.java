package com.mtg.deckbuilder.game.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtg.deckbuilder.game.domain.ChatMessage;
import com.mtg.deckbuilder.game.domain.GameState;
import com.mtg.deckbuilder.game.domain.PlayerState;
import com.mtg.deckbuilder.game.domain.RoomStatus;
import com.mtg.deckbuilder.game.domain.RoomSummary;
import com.mtg.deckbuilder.game.domain.Spectator;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Stores each game as a Redis Hash {@code game:{roomId}} with one field of metadata and one
 * field per player. A session TTL is (re)applied on every save so abandoned rooms expire.
 *
 * <p>Open public lobbies are additionally projected into a single hash, {@code game:lobbies},
 * so the browser can list them without loading (and deserializing) every library in every room.
 * That index is not TTL'd: entries for rooms that have since expired are pruned lazily on read.
 */
@Component
public class RedisGameStateStore implements GameStateStore {

  private static final Logger log = LoggerFactory.getLogger(RedisGameStateStore.class);
  private static final String KEY_PREFIX = "game:";
  private static final String LOBBY_INDEX_KEY = "game:lobbies";
  private static final String META_FIELD = "meta";
  private static final String PLAYER_FIELD_PREFIX = "p:";

  private final StringRedisTemplate redis;
  private final ObjectMapper mapper;
  private final Duration ttl;

  public RedisGameStateStore(StringRedisTemplate redis,
                             ObjectMapper mapper,
                             @Value("${game.session-ttl-hours:6}") long ttlHours) {
    this.redis = redis;
    this.mapper = mapper;
    this.ttl = Duration.ofHours(ttlHours);
  }

  /** Metadata serialized into the {@code meta} hash field (players go in their own fields). */
  private record Meta(String roomId, String name, int maxPlayers, int turn,
                      String activePlayerId, List<String> playerOrder, RoomStatus status,
                      String hostId, boolean publicRoom, List<Spectator> spectators,
                      List<ChatMessage> chat, long createdAt) {
  }

  @Override
  public void save(GameState state) {
    String key = KEY_PREFIX + state.getRoomId();
    try {
      List<String> order = state.getPlayers().stream().map(PlayerState::getPlayerId).toList();
      Meta meta = new Meta(state.getRoomId(), state.getName(), state.getMaxPlayers(),
          state.getTurn(), state.getActivePlayerId(), order, state.getStatus(),
          state.getHostId(), state.isPublicRoom(), state.getSpectators(), state.getChat(),
          state.getCreatedAt());
      redis.opsForHash().put(key, META_FIELD, mapper.writeValueAsString(meta));
      for (PlayerState player : state.getPlayers()) {
        redis.opsForHash().put(key, PLAYER_FIELD_PREFIX + player.getPlayerId(),
            mapper.writeValueAsString(player));
      }
      redis.expire(key, ttl);
      indexLobby(state);
    } catch (Exception e) {
      log.error("Failed to persist game {}: {}", state.getRoomId(), e.getMessage());
      throw new IllegalStateException("Could not save game state", e);
    }
  }

  /** Keeps the public browser in sync: a room leaves the index as soon as it starts or goes private. */
  private void indexLobby(GameState state) throws Exception {
    boolean listed = state.isPublicRoom() && state.getStatus() == RoomStatus.LOBBY;
    if (listed) {
      redis.opsForHash().put(LOBBY_INDEX_KEY, state.getRoomId(),
          mapper.writeValueAsString(RoomSummary.of(state)));
    } else {
      redis.opsForHash().delete(LOBBY_INDEX_KEY, state.getRoomId());
    }
  }

  @Override
  public Optional<GameState> find(String roomId) {
    String key = KEY_PREFIX + roomId;
    Map<Object, Object> entries = redis.opsForHash().entries(key);
    if (entries.isEmpty()) {
      return Optional.empty();
    }
    try {
      Meta meta = mapper.readValue((String) entries.get(META_FIELD), Meta.class);
      GameState state = new GameState(meta.roomId(), meta.name(), meta.maxPlayers());
      state.setTurn(meta.turn());
      state.setActivePlayerId(meta.activePlayerId());
      state.setStatus(meta.status() == null ? RoomStatus.LOBBY : meta.status());
      state.setHostId(meta.hostId());
      state.setPublicRoom(meta.publicRoom());
      state.setSpectators(meta.spectators() == null ? new ArrayList<>()
          : new ArrayList<>(meta.spectators()));
      state.setChat(meta.chat() == null ? new ArrayList<>() : new ArrayList<>(meta.chat()));
      if (meta.createdAt() > 0) {
        state.setCreatedAt(meta.createdAt());
      }

      List<PlayerState> players = new ArrayList<>();
      for (String playerId : meta.playerOrder()) {
        Object raw = entries.get(PLAYER_FIELD_PREFIX + playerId);
        if (raw != null) {
          players.add(mapper.readValue((String) raw, PlayerState.class));
        }
      }
      state.setPlayers(players);
      return Optional.of(state);
    } catch (Exception e) {
      log.error("Failed to read game {}: {}", roomId, e.getMessage());
      return Optional.empty();
    }
  }

  @Override
  public boolean exists(String roomId) {
    return Boolean.TRUE.equals(redis.hasKey(KEY_PREFIX + roomId));
  }

  @Override
  public void delete(String roomId) {
    redis.delete(KEY_PREFIX + roomId);
    redis.opsForHash().delete(LOBBY_INDEX_KEY, roomId);
  }

  @Override
  public List<RoomSummary> publicLobbies() {
    Map<Object, Object> entries = redis.opsForHash().entries(LOBBY_INDEX_KEY);
    List<RoomSummary> lobbies = new ArrayList<>();
    List<Object> stale = new ArrayList<>();
    for (Map.Entry<Object, Object> entry : entries.entrySet()) {
      String roomId = (String) entry.getKey();
      if (!exists(roomId)) {
        stale.add(roomId); // the room hash hit its TTL; drop the dangling index entry
        continue;
      }
      try {
        lobbies.add(mapper.readValue((String) entry.getValue(), RoomSummary.class));
      } catch (Exception e) {
        log.warn("Dropping unreadable lobby index entry {}: {}", roomId, e.getMessage());
        stale.add(roomId);
      }
    }
    if (!stale.isEmpty()) {
      redis.opsForHash().delete(LOBBY_INDEX_KEY, stale.toArray());
    }
    lobbies.sort(Comparator.comparingLong(RoomSummary::createdAt).reversed());
    return lobbies;
  }
}
