package com.mtg.deckbuilder.forum.rgpd;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtg.deckbuilder.forum.repo.CommentRepository;
import com.mtg.deckbuilder.forum.repo.PostRepository;
import com.mtg.deckbuilder.forum.repo.ThreadRepository;
import com.mtg.deckbuilder.forum.repo.VoteRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

/** On {@code USER_DELETED}, purges the user's threads, posts and comments from MongoDB. */
@Component
public class UserDeletedListener implements MessageListener {

    private static final Logger log = LoggerFactory.getLogger(UserDeletedListener.class);

    private final ThreadRepository threadRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final VoteRepository voteRepository;
    private final ObjectMapper objectMapper;

    public UserDeletedListener(ThreadRepository threadRepository,
                               PostRepository postRepository,
                               CommentRepository commentRepository,
                               VoteRepository voteRepository,
                               ObjectMapper objectMapper) {
        this.threadRepository = threadRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.voteRepository = voteRepository;
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
            long comments = commentRepository.deleteByAuthorId(userId);
            long posts = postRepository.deleteByAuthorId(userId);
            long threads = threadRepository.deleteByAuthorId(userId);
            long votes = voteRepository.deleteByUserId(userId);
            log.info("USER_DELETED: removed {} threads, {} posts, {} comments, {} votes for {}",
                threads, posts, comments, votes, userId);
        } catch (Exception e) {
            log.error("Failed to process user event: {}", e.getMessage());
        }
    }
}
