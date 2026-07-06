package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.domain.ForumCategory;
import com.mtg.deckbuilder.forum.domain.ForumSettings;
import com.mtg.deckbuilder.forum.domain.ModerationStatus;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.moderation.ContentType;
import com.mtg.deckbuilder.forum.moderation.ModerationResult;
import com.mtg.deckbuilder.forum.moderation.ModerationService;
import com.mtg.deckbuilder.forum.repo.ThreadRepository;
import com.mtg.deckbuilder.forum.service.RoleService.DefaultRoles;
import com.mtg.deckbuilder.forum.web.ModerationRejectedException;
import com.mtg.deckbuilder.forum.web.NotFoundException;
import com.mtg.deckbuilder.forum.web.dto.CreateThreadRequest;
import com.mtg.deckbuilder.forum.web.dto.CursorPage;
import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class ForumService {

    private static final Pattern SLUG_STRIP = Pattern.compile("[^a-z0-9]+");

    private final ThreadRepository threadRepository;
    private final ModerationService moderationService;
    private final RoleService roleService;
    private final MembershipService membershipService;

    public ForumService(ThreadRepository threadRepository,
                        ModerationService moderationService,
                        RoleService roleService,
                        MembershipService membershipService) {
        this.threadRepository = threadRepository;
        this.moderationService = moderationService;
        this.roleService = roleService;
        this.membershipService = membershipService;
    }

    public Thread get(String id) {
        return threadRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Forum not found: " + id));
    }

    /**
     * Creates a forum board: runs moderation on the name + description first (blocking outright on a
     * hard violation), then provisions the default roles and makes the creator its admin member.
     */
    public Thread create(UUID authorId, String authorName, CreateThreadRequest req) {
        ModerationResult nameCheck = moderationService.moderate(req.title(), ContentType.FORUM_NAME);
        if (nameCheck.isBlocked()) {
            throw new ModerationRejectedException(nameCheck.reason());
        }
        ModerationResult descCheck =
            moderationService.moderate(req.description(), ContentType.FORUM_DESCRIPTION);
        if (descCheck.isBlocked()) {
            throw new ModerationRejectedException(descCheck.reason());
        }
        // The stricter of the two verdicts decides the forum's initial visibility.
        ModerationStatus status = mostRestrictive(nameCheck.toStatus(), descCheck.toStatus());

        Thread t = new Thread();
        t.setTitle(req.title());
        t.setDescription(req.description());
        t.setCategory(ForumCategory.parse(req.category()).name());
        t.setTags(req.tags() == null ? List.of() : req.tags());
        t.setCoverImage(req.coverImage());
        t.setBannerImage(req.bannerImage());
        t.setLanguage(req.language());
        t.setNsfw(Boolean.TRUE.equals(req.nsfw()));
        t.setPrivate(Boolean.TRUE.equals(req.isPrivate()));
        t.setSettings(ForumSettings.defaults());
        t.setModerationStatus(status);
        if (status == ModerationStatus.PENDING) {
            t.setRejectionReason(firstReason(nameCheck, descCheck));
        }
        t.setAuthorId(authorId);
        t.setAuthorName(authorName);
        t.setMemberCount(1);
        Instant now = Instant.now();
        t.setCreatedAt(now);
        t.setLastActivityAt(now);
        Thread saved = threadRepository.save(t);
        saved.setSlug(slugify(saved.getTitle(), saved.getId()));
        saved = threadRepository.save(saved);

        // Discord-style roles + creator becomes the forum admin.
        DefaultRoles roles = roleService.provisionDefaults(saved.getId());
        membershipService.addMember(saved.getId(), authorId, authorName, null, roles.adminRoleId());
        return saved;
    }

    /** Cursor-paginated list of approved forums ordered by most recent activity. */
    public CursorPage<Thread> list(String cursor, int limit) {
        Instant before = CursorPage.decodeCursor(cursor);
        PageRequest page = PageRequest.of(0, limit + 1);
        List<Thread> fetched = before == null
            ? threadRepository.findByOrderByLastActivityAtDesc(page)
            : threadRepository.findByLastActivityAtLessThanOrderByLastActivityAtDesc(before, page);
        return CursorPage.of(fetched, limit, Thread::getLastActivityAt);
    }

    /** Bumps a forum's topic count + recency when a new thread (Post) is created in it. */
    public void touch(Thread thread) {
        thread.setPostCount(thread.getPostCount() + 1);
        thread.setLastActivityAt(Instant.now());
        threadRepository.save(thread);
    }

    /** Recomputes a forum's denormalised member count from the membership collection. */
    public void refreshMemberCount(String forumId) {
        threadRepository.findById(forumId).ifPresent(t -> {
            t.setMemberCount(membershipService.memberCount(forumId));
            threadRepository.save(t);
        });
    }

    private static ModerationStatus mostRestrictive(ModerationStatus a, ModerationStatus b) {
        return (a == ModerationStatus.PENDING || b == ModerationStatus.PENDING)
            ? ModerationStatus.PENDING : ModerationStatus.APPROVED;
    }

    private static String firstReason(ModerationResult a, ModerationResult b) {
        return a.reason() != null ? a.reason() : b.reason();
    }

    /** Builds a URL-safe slug from the title, suffixed with a short id fragment for uniqueness. */
    static String slugify(String title, String id) {
        String base = Normalizer.normalize(title == null ? "" : title, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
            .toLowerCase(Locale.ROOT);
        base = SLUG_STRIP.matcher(base).replaceAll("-").replaceAll("(^-+|-+$)", "");
        if (base.isBlank()) {
            base = "forum";
        }
        if (base.length() > 60) {
            base = base.substring(0, 60).replaceAll("-+$", "");
        }
        String suffix = id == null ? "" : id.substring(Math.max(0, id.length() - 6));
        return base + "-" + suffix;
    }
}
