package com.mtg.deckbuilder.forum.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mtg.deckbuilder.forum.domain.ForumRole;
import com.mtg.deckbuilder.forum.repo.ForumRoleRepository;
import com.mtg.deckbuilder.forum.web.ForbiddenException;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class RoleServiceTest {

    private final ForumRoleRepository roleRepository = mock(ForumRoleRepository.class);
    private final RoleService service = new RoleService(roleRepository);

    private ForumRole role(String id, String forumId, boolean admin, boolean isDefault) {
        ForumRole r = new ForumRole();
        r.setId(id);
        r.setForumId(forumId);
        r.setAdmin(admin);
        r.setDefault(isDefault);
        return r;
    }

    @Test
    void adminRoleCannotBeDeleted() {
        when(roleRepository.findById("admin")).thenReturn(Optional.of(role("admin", "f1", true, false)));

        assertThatThrownBy(() -> service.delete("f1", "admin")).isInstanceOf(ForbiddenException.class);
        verify(roleRepository, never()).delete(any());
    }

    @Test
    void defaultRoleCannotBeDeleted() {
        when(roleRepository.findById("member")).thenReturn(Optional.of(role("member", "f1", false, true)));

        assertThatThrownBy(() -> service.delete("f1", "member")).isInstanceOf(ForbiddenException.class);
        verify(roleRepository, never()).delete(any());
    }

    @Test
    void customRoleIsDeleted() {
        ForumRole custom = role("mod", "f1", false, false);
        when(roleRepository.findById("mod")).thenReturn(Optional.of(custom));

        service.delete("f1", "mod");

        verify(roleRepository).delete(custom);
    }
}
