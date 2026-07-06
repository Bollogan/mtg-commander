package com.mtg.deckbuilder.forum.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.moderation.ContentType;
import com.mtg.deckbuilder.forum.moderation.ModerationAction;
import com.mtg.deckbuilder.forum.moderation.ModerationResult;
import com.mtg.deckbuilder.forum.moderation.ModerationService;
import com.mtg.deckbuilder.forum.repo.ThreadRepository;
import com.mtg.deckbuilder.forum.service.RoleService.DefaultRoles;
import com.mtg.deckbuilder.forum.web.ModerationRejectedException;
import com.mtg.deckbuilder.forum.web.dto.CreateThreadRequest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ForumServiceTest {

    private final ThreadRepository threadRepository = mock(ThreadRepository.class);
    private final ModerationService moderationService = mock(ModerationService.class);
    private final RoleService roleService = mock(RoleService.class);
    private final MembershipService membershipService = mock(MembershipService.class);
    private final ForumService service =
        new ForumService(threadRepository, moderationService, roleService, membershipService);

    private final UUID author = UUID.randomUUID();

    private CreateThreadRequest req(String title) {
        return new CreateThreadRequest(title, "A friendly place", "RULES",
            List.of("commander"), null, null, "es", false, false);
    }

    @Test
    void createProvisionsRolesAndMakesCreatorAdmin() {
        when(moderationService.moderate(any(), any())).thenReturn(ModerationResult.allow());
        when(threadRepository.save(any())).thenAnswer(inv -> {
            Thread t = inv.getArgument(0);
            if (t.getId() == null) {
                t.setId("forum123");
            }
            return t;
        });
        when(roleService.provisionDefaults("forum123"))
            .thenReturn(new DefaultRoles("adminRole", "memberRole"));

        Thread created = service.create(author, "Alice", req("Rules Nerds"));

        assertThat(created.getModerationStatus()).isEqualTo(ModerationStatus.APPROVED);
        assertThat(created.getMemberCount()).isEqualTo(1);
        assertThat(created.getSlug()).startsWith("rules-nerds-");
        assertThat(created.getCategory()).isEqualTo("RULES");
        verify(roleService).provisionDefaults("forum123");
        verify(membershipService).addMember(eq("forum123"), eq(author), eq("Alice"), isNull(), eq("adminRole"));
    }

    @Test
    void blockedNameIsRejectedAndNothingIsPersisted() {
        when(moderationService.moderate(eq("Rules Nerds"), eq(ContentType.FORUM_NAME)))
            .thenReturn(new ModerationResult(ModerationAction.BLOCK, 0.95, List.of(), "blocked: slur"));

        assertThatThrownBy(() -> service.create(author, "Alice", req("Rules Nerds")))
            .isInstanceOf(ModerationRejectedException.class);

        verify(threadRepository, never()).save(any());
        verify(roleService, never()).provisionDefaults(any());
    }

    @Test
    void pendingDescriptionCreatesAForumHeldForReview() {
        when(moderationService.moderate(eq("Rules Nerds"), eq(ContentType.FORUM_NAME)))
            .thenReturn(ModerationResult.allow());
        when(moderationService.moderate(any(), eq(ContentType.FORUM_DESCRIPTION)))
            .thenReturn(new ModerationResult(ModerationAction.PENDING_REVIEW, 0.7, List.of(), "held: review"));
        when(threadRepository.save(any())).thenAnswer(inv -> {
            Thread t = inv.getArgument(0);
            if (t.getId() == null) {
                t.setId("forum123");
            }
            return t;
        });
        when(roleService.provisionDefaults(any())).thenReturn(new DefaultRoles("a", "m"));

        Thread created = service.create(author, "Alice", req("Rules Nerds"));

        assertThat(created.getModerationStatus()).isEqualTo(ModerationStatus.PENDING);
        assertThat(created.getRejectionReason()).isEqualTo("held: review");
    }
}
