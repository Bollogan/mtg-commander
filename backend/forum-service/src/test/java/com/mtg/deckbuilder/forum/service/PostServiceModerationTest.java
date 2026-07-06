package com.mtg.deckbuilder.forum.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mtg.deckbuilder.forum.client.UserSummary;
import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.event.ForumEventPublisher;
import com.mtg.deckbuilder.forum.moderation.ContentType;
import com.mtg.deckbuilder.forum.moderation.ModerationAction;
import com.mtg.deckbuilder.forum.moderation.ModerationResult;
import com.mtg.deckbuilder.forum.moderation.ModerationService;
import com.mtg.deckbuilder.forum.notify.NotificationPublisher;
import com.mtg.deckbuilder.forum.repo.PostRepository;
import com.mtg.deckbuilder.forum.web.ModerationRejectedException;
import com.mtg.deckbuilder.forum.web.dto.CreatePostRequest;
import com.mtg.deckbuilder.forum.event.ForumEvent;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;

class PostServiceModerationTest {

    private final PostRepository postRepository = mock(PostRepository.class);
    private final ForumService forumService = mock(ForumService.class);
    private final UserEnrichmentService enrichment = mock(UserEnrichmentService.class);
    private final NotificationPublisher notifications = mock(NotificationPublisher.class);
    private final ModerationService moderationService = mock(ModerationService.class);
    private final MongoTemplate mongoTemplate = mock(MongoTemplate.class);
    private final ForumEventPublisher events = mock(ForumEventPublisher.class);
    private final PostService service = new PostService(
        postRepository, forumService, enrichment, notifications, moderationService, mongoTemplate, events);

    private final UUID author = UUID.randomUUID();

    @BeforeEach
    void setup() {
        when(forumService.get("f1")).thenReturn(new Thread());
        when(enrichment.lookup(author)).thenReturn(new UserSummary(author, "Alice", null));
        when(enrichment.followersOf(author)).thenReturn(List.of(UUID.randomUUID()));
        when(postRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private CreatePostRequest req() {
        return new CreatePostRequest("Best combos", "Let's discuss");
    }

    @Test
    void blockedPostIsRejectedAndNothingIsPersisted() {
        when(moderationService.moderate(any(), any()))
            .thenReturn(new ModerationResult(ModerationAction.BLOCK, 0.95, List.of(), "blocked"));

        assertThatThrownBy(() -> service.create("f1", author, req()))
            .isInstanceOf(ModerationRejectedException.class);

        verify(postRepository, never()).save(any());
        verify(forumService, never()).touch(any());
    }

    @Test
    void pendingPostIsHeldWithoutBumpingActivityOrNotifying() {
        when(moderationService.moderate(any(), any()))
            .thenReturn(new ModerationResult(ModerationAction.PENDING_REVIEW, 0.7, List.of(), "held"));

        Post created = service.create("f1", author, req());

        assertThat(created.getModerationStatus()).isEqualTo(ModerationStatus.PENDING);
        assertThat(created.getRejectionReason()).isEqualTo("held");
        verify(forumService, never()).touch(any());
        verify(notifications, never()).publish(any());
        // Held content still lights up moderators' realtime dashboards (Phase 6).
        ArgumentCaptor<ForumEvent> captor = ArgumentCaptor.forClass(ForumEvent.class);
        verify(events).publish(captor.capture());
        assertThat(captor.getValue().type()).isEqualTo("CONTENT_FLAGGED");
    }

    @Test
    void approvedPostBumpsActivityAndNotifiesFollowers() {
        when(moderationService.moderate(any(), any())).thenReturn(ModerationResult.allow());

        Post created = service.create("f1", author, req());

        assertThat(created.getModerationStatus()).isEqualTo(ModerationStatus.APPROVED);
        verify(forumService).touch(any());
        verify(notifications).publish(any());
        ArgumentCaptor<ForumEvent> captor = ArgumentCaptor.forClass(ForumEvent.class);
        verify(events).publish(captor.capture());
        assertThat(captor.getValue().type()).isEqualTo("NEW_POST");
    }

    @Test
    void moderationRunsAgainstTitleAndBodyAsThreadCreation() {
        when(moderationService.moderate(any(), any())).thenReturn(ModerationResult.allow());

        service.create("f1", author, req());

        verify(moderationService).moderate(
            org.mockito.ArgumentMatchers.contains("Best combos"), org.mockito.ArgumentMatchers.eq(ContentType.THREAD_CREATION));
    }
}
