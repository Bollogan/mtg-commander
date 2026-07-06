package com.mtg.deckbuilder.forum.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mtg.deckbuilder.forum.domain.Comment;
import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.event.ForumEventPublisher;
import com.mtg.deckbuilder.forum.notify.NotificationMessage;
import com.mtg.deckbuilder.forum.notify.NotificationPublisher;
import com.mtg.deckbuilder.forum.repo.CommentRepository;
import com.mtg.deckbuilder.forum.repo.PostRepository;
import com.mtg.deckbuilder.forum.service.ModerationQueueService.ItemFilter;
import com.mtg.deckbuilder.forum.web.NotFoundException;
import com.mtg.deckbuilder.forum.web.dto.ModerationItemDto;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ModerationQueueServiceTest {

    private final PostRepository postRepository = mock(PostRepository.class);
    private final CommentRepository commentRepository = mock(CommentRepository.class);
    private final ForumService forumService = mock(ForumService.class);
    private final PostService postService = mock(PostService.class);
    private final NotificationPublisher notifications = mock(NotificationPublisher.class);
    private final ForumEventPublisher events = mock(ForumEventPublisher.class);
    private final ModerationQueueService service = new ModerationQueueService(
        postRepository, commentRepository, forumService, postService, notifications, events);

    private final UUID moderator = UUID.randomUUID();
    private final UUID author = UUID.randomUUID();

    private Post pendingPost() {
        Post p = new Post();
        p.setId("p1");
        p.setThreadId("f1");
        p.setAuthorId(author);
        p.setTitle("A topic");
        p.setModerationStatus(ModerationStatus.PENDING);
        p.setCreatedAt(Instant.now());
        return p;
    }

    @Test
    void approvingHeldPostPublishesItBumpsActivityAndNotifies() {
        Post post = pendingPost();
        when(postRepository.findById("p1")).thenReturn(Optional.of(post));
        when(postRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(forumService.get("f1")).thenReturn(new Thread());

        ModerationItemDto dto = service.approvePost("f1", "p1", moderator);

        assertThat(dto.moderationStatus()).isEqualTo("APPROVED");
        assertThat(post.getModerationStatus()).isEqualTo(ModerationStatus.APPROVED);
        verify(forumService).touch(any());
        verify(notifications).publish(any(NotificationMessage.class));
    }

    @Test
    void approvingAlreadyApprovedPostDoesNotBumpActivityTwice() {
        Post post = pendingPost();
        post.setModerationStatus(ModerationStatus.APPROVED);
        when(postRepository.findById("p1")).thenReturn(Optional.of(post));
        when(postRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.approvePost("f1", "p1", moderator);

        verify(forumService, never()).touch(any());
        verify(notifications, never()).publish(any());
    }

    @Test
    void rejectingPostHidesItWithReasonAndNotifies() {
        Post post = pendingPost();
        when(postRepository.findById("p1")).thenReturn(Optional.of(post));
        when(postRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ModerationItemDto dto = service.rejectPost("f1", "p1", moderator, "spam");

        assertThat(dto.moderationStatus()).isEqualTo("REJECTED");
        assertThat(post.getRejectionReason()).isEqualTo("spam");
        verify(notifications).publish(any());
    }

    @Test
    void reportingApprovedPostSendsItBackToReviewAndFlagsIt() {
        Post post = pendingPost();
        post.setModerationStatus(ModerationStatus.APPROVED);
        when(postRepository.findById("p1")).thenReturn(Optional.of(post));
        when(postRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.reportPost("f1", "p1", moderator, "offensive");

        assertThat(post.getModerationStatus()).isEqualTo(ModerationStatus.PENDING);
        assertThat(post.getModerationFlags()).hasSize(1);
    }

    @Test
    void actingOnContentFromAnotherForumIs404() {
        Post post = pendingPost();
        post.setThreadId("other-forum");
        when(postRepository.findById("p1")).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> service.approvePost("f1", "p1", moderator))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void approvingHeldCommentBumpsParentCommentCount() {
        Comment comment = new Comment();
        comment.setId("c1");
        comment.setPostId("p1");
        comment.setAuthorId(author);
        comment.setModerationStatus(ModerationStatus.PENDING);
        comment.setCreatedAt(Instant.now());
        Post parent = pendingPost();
        parent.setModerationStatus(ModerationStatus.APPROVED);

        when(commentRepository.findById("c1")).thenReturn(Optional.of(comment));
        when(postRepository.findById("p1")).thenReturn(Optional.of(parent));
        when(commentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ModerationItemDto dto = service.approveComment("f1", "c1", moderator);

        assertThat(dto.type()).isEqualTo("COMMENT");
        assertThat(comment.getModerationStatus()).isEqualTo(ModerationStatus.APPROVED);
        verify(postService).incrementCommentCount(parent);
    }
}
