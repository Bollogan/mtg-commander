package com.mtg.deckbuilder.deck.rgpd;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtg.deckbuilder.deck.repo.DeckRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

/**
 * On {@code USER_DELETED} (RGPD erasure), purges every deck owned by the deleted user so no
 * orphan documents remain in MongoDB.
 */
@Component
public class UserDeletedListener implements MessageListener {

    private static final Logger log = LoggerFactory.getLogger(UserDeletedListener.class);

    private final DeckRepository deckRepository;
    private final ObjectMapper objectMapper;

    public UserDeletedListener(DeckRepository deckRepository, ObjectMapper objectMapper) {
        this.deckRepository = deckRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            JsonNode event = objectMapper.readTree(message.getBody());
            if (!"USER_DELETED".equals(event.path("type").asText())) {
                return;
            }
            UUID userId = UUID.fromString(event.path("userId").asText());
            long removed = deckRepository.deleteByOwnerId(userId);
            log.info("USER_DELETED: removed {} decks for {}", removed, userId);
        } catch (Exception e) {
            log.error("Failed to process user event: {}", e.getMessage());
        }
    }
}
