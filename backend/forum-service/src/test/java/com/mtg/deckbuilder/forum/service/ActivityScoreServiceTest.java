package com.mtg.deckbuilder.forum.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.repo.CommentRepository;
import com.mtg.deckbuilder.forum.repo.ForumMembershipRepository;
import com.mtg.deckbuilder.forum.repo.PostRepository;
import com.mtg.deckbuilder.forum.repo.PostRepository.PostIdView;
import com.mtg.deckbuilder.forum.repo.ThreadRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ActivityScoreServiceTest {

    private final ThreadRepository threadRepository = mock(ThreadRepository.class);
    private final PostRepository postRepository = mock(PostRepository.class);
    private final CommentRepository commentRepository = mock(CommentRepository.class);
    private final ForumMembershipRepository membershipRepository = mock(ForumMembershipRepository.class);
    private final ActivityScoreService service = new ActivityScoreService(
        threadRepository, postRepository, commentRepository, membershipRepository);

    private Post post(UUID author) {
        Post p = new Post();
        p.setAuthorId(author);
        return p;
    }

    private PostIdView idView(String id) {
        return () -> id;
    }

    @Test
    void weightsAndRecencyBonusAreApplied() {
        Thread forum = new Thread();
        forum.setId("f1");
        forum.setLastActivityAt(Instant.now()); // active within 24h → 1.5x bonus

        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        // 2 new topics by 2 distinct authors this week
        when(postRepository.findByThreadIdAndCreatedAtAfter(eq("f1"), any()))
            .thenReturn(List.of(post(a), post(b)));
        // forum has 3 topics overall
        when(postRepository.findByThreadId("f1"))
            .thenReturn(List.of(idView("p1"), idView("p2"), idView("p3")));
        // 5 replies this week across those topics
        when(commentRepository.countByPostIdInAndCreatedAtAfter(anyCollection(), any())).thenReturn(5L);
        // 4 new members this week
        when(membershipRepository.countByForumIdAndJoinedAtAfter(eq("f1"), any())).thenReturn(4L);

        long score = service.recompute(forum);

        // (2*10 + 5*3 + 4*5 + 2*8) * 1.5 = 71 * 1.5 = 106.5 -> 107
        assertThat(score).isEqualTo(107);
        assertThat(forum.getWeeklyActivityScore()).isEqualTo(107);
        verify(threadRepository).save(forum);
    }

    @Test
    void inactiveForumGetsNoRecencyBonus() {
        Thread forum = new Thread();
        forum.setId("f1");
        forum.setLastActivityAt(Instant.now().minus(3, ChronoUnit.DAYS)); // stale → 1.0x

        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        when(postRepository.findByThreadIdAndCreatedAtAfter(eq("f1"), any()))
            .thenReturn(List.of(post(a), post(b)));
        when(postRepository.findByThreadId("f1"))
            .thenReturn(List.of(idView("p1"), idView("p2"), idView("p3")));
        when(commentRepository.countByPostIdInAndCreatedAtAfter(anyCollection(), any())).thenReturn(5L);
        when(membershipRepository.countByForumIdAndJoinedAtAfter(eq("f1"), any())).thenReturn(4L);

        long score = service.recompute(forum);

        assertThat(score).isEqualTo(71);
    }

    @Test
    void emptyForumScoresZeroAndSkipsCommentCount() {
        Thread forum = new Thread();
        forum.setId("f1");
        forum.setLastActivityAt(Instant.now());

        when(postRepository.findByThreadIdAndCreatedAtAfter(eq("f1"), any())).thenReturn(List.of());
        when(postRepository.findByThreadId("f1")).thenReturn(List.of());
        when(membershipRepository.countByForumIdAndJoinedAtAfter(eq("f1"), any())).thenReturn(0L);

        long score = service.recompute(forum);

        assertThat(score).isEqualTo(0);
        // No topics → comment count query must not be issued.
        verify(commentRepository, org.mockito.Mockito.never())
            .countByPostIdInAndCreatedAtAfter(anyCollection(), any());
    }

    @Test
    void recomputeAllIteratesEveryForumAndSurvivesFailures() {
        Thread good = new Thread();
        good.setId("good");
        good.setLastActivityAt(Instant.now());
        Thread bad = new Thread();
        bad.setId("bad");

        when(threadRepository.findAll()).thenReturn(List.of(bad, good));
        // "bad" throws when its topics are queried; "good" succeeds.
        when(postRepository.findByThreadIdAndCreatedAtAfter(eq("bad"), any()))
            .thenThrow(new RuntimeException("boom"));
        when(postRepository.findByThreadIdAndCreatedAtAfter(eq("good"), any())).thenReturn(List.of());
        when(postRepository.findByThreadId("good")).thenReturn(List.of());
        when(membershipRepository.countByForumIdAndJoinedAtAfter(eq("good"), any())).thenReturn(0L);

        service.recomputeAll();

        verify(threadRepository).save(good);
    }
}
