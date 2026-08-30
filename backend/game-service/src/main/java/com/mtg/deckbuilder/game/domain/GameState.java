package com.mtg.deckbuilder.game.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Full state of a game room — lobby included. Redis is the single source of truth. */
@JsonIgnoreProperties(ignoreUnknown = true)
public class GameState {

  /** Chat is kept inline with the room; only the tail is retained so the state stays small. */
  public static final int MAX_CHAT = 60;

  private String roomId;
  private String name;
  private int maxPlayers = 4;
  private int turn = 1;
  private String activePlayerId;
  private List<PlayerState> players = new ArrayList<>();

  // ── Lobby ──────────────────────────────────────────────────────────────────
  private RoomStatus status = RoomStatus.LOBBY;
  /** The player who owns the room: starts the game, kicks, closes, hands the role over. */
  private String hostId;
  /** Public rooms show up in the open-games browser; private ones are invite-link only. */
  private boolean publicRoom = false;
  private List<Spectator> spectators = new ArrayList<>();
  private List<ChatMessage> chat = new ArrayList<>();
  /** Epoch millis — see {@link ChatMessage} for why java.time is avoided on the wire. */
  private long createdAt = Instant.now().toEpochMilli();

  public GameState() {
  }

  public GameState(String roomId, String name, int maxPlayers) {
    this.roomId = roomId;
    this.name = name;
    this.maxPlayers = maxPlayers;
  }

  public Optional<PlayerState> player(String playerId) {
    return players.stream().filter(p -> p.getPlayerId().equals(playerId)).findFirst();
  }

  @JsonIgnore
  public boolean isFull() {
    return players.size() >= maxPlayers;
  }

  @JsonIgnore
  public boolean isHost(String userId) {
    return hostId != null && hostId.equals(userId);
  }

  /** Everyone in the room, seated or watching — i.e. everyone allowed to chat. */
  @JsonIgnore
  public boolean isMember(String userId) {
    return player(userId).isPresent() || isSpectator(userId);
  }

  @JsonIgnore
  public boolean isSpectator(String userId) {
    return spectators.stream().anyMatch(s -> s.userId().equals(userId));
  }

  /** Display name of the host, for the lobby browser. */
  @JsonIgnore
  public String hostName() {
    return player(hostId).map(PlayerState::getPlayerName).orElse("—");
  }

  /** Appends a chat line, dropping the oldest once {@link #MAX_CHAT} is exceeded. */
  public void addChat(ChatMessage message) {
    chat.add(message);
    while (chat.size() > MAX_CHAT) {
      chat.remove(0);
    }
  }

  /**
   * The view of this room that may be sent to {@code viewerId}. Libraries are hidden from
   * everyone (nobody gets to read the top of a deck) and hands from everyone but their owner —
   * only the sizes travel. Without this the broadcast handed every client every opponent's
   * library and hand, which is simply the game solved.
   *
   * <p>Returns a copy; the stored state keeps the real zones.
   */
  public GameState redactedFor(String viewerId) {
    GameState view = new GameState(roomId, name, maxPlayers);
    view.turn = turn;
    view.activePlayerId = activePlayerId;
    view.status = status;
    view.hostId = hostId;
    view.publicRoom = publicRoom;
    view.spectators = new ArrayList<>(spectators);
    view.chat = new ArrayList<>(chat);
    view.createdAt = createdAt;

    for (PlayerState player : players) {
      PlayerState copy = new PlayerState(player.getPlayerId(), player.getPlayerName());
      copy.setLife(player.getLife());
      copy.setMulliganCount(player.getMulliganCount());
      copy.setDeckId(player.getDeckId());
      copy.setDeckName(player.getDeckName());
      copy.setReady(player.isReady());
      copy.setConnected(player.isConnected());
      copy.setBattlefield(player.getBattlefield());
      copy.setGraveyard(player.getGraveyard());
      copy.setLibrarySize(player.getLibrary().size());
      copy.setHandSize(player.getHand().size());
      // Library: size only, always. Hand: contents only for its owner.
      copy.setLibrary(List.of());
      copy.setHand(player.getPlayerId().equals(viewerId) ? player.getHand() : List.of());
      view.players.add(copy);
    }
    return view;
  }

  public String getRoomId() {
    return roomId;
  }

  public void setRoomId(String roomId) {
    this.roomId = roomId;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public int getMaxPlayers() {
    return maxPlayers;
  }

  public void setMaxPlayers(int maxPlayers) {
    this.maxPlayers = maxPlayers;
  }

  public int getTurn() {
    return turn;
  }

  public void setTurn(int turn) {
    this.turn = turn;
  }

  public String getActivePlayerId() {
    return activePlayerId;
  }

  public void setActivePlayerId(String activePlayerId) {
    this.activePlayerId = activePlayerId;
  }

  public List<PlayerState> getPlayers() {
    return players;
  }

  public void setPlayers(List<PlayerState> players) {
    this.players = players;
  }

  public RoomStatus getStatus() {
    return status;
  }

  public void setStatus(RoomStatus status) {
    this.status = status;
  }

  public String getHostId() {
    return hostId;
  }

  public void setHostId(String hostId) {
    this.hostId = hostId;
  }

  public boolean isPublicRoom() {
    return publicRoom;
  }

  public void setPublicRoom(boolean publicRoom) {
    this.publicRoom = publicRoom;
  }

  public List<Spectator> getSpectators() {
    return spectators;
  }

  public void setSpectators(List<Spectator> spectators) {
    this.spectators = spectators;
  }

  public List<ChatMessage> getChat() {
    return chat;
  }

  public void setChat(List<ChatMessage> chat) {
    this.chat = chat;
  }

  public long getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(long createdAt) {
    this.createdAt = createdAt;
  }
}
