package com.mtg.deckbuilder.forum.service;

import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.repo.ThreadRepository;
import com.mtg.deckbuilder.forum.web.NotFoundException;
import com.mtg.deckbuilder.forum.web.dto.CreateThreadRequest;
import com.mtg.deckbuilder.forum.web.dto.CursorPage;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class ForumService {

    private final ThreadRepository threadRepository;

    public ForumService(ThreadRepository threadRepository) {
        this.threadRepository = threadRepository;
    }

    public Thread get(String id) {
        return threadRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Forum not found: " + id));
    }

    public Thread create(UUID authorId, String authorName, CreateThreadRequest req) {
        Thread t = new Thread();
        t.setTitle(req.title());
        t.setDescription(req.description());
        t.setCategory(req.category());
        t.setAuthorId(authorId);
        t.setAuthorName(authorName);
        Instant now = Instant.now();
        t.setCreatedAt(now);
        t.setLastActivityAt(now);
        return threadRepository.save(t);
    }

    /** Cursor-paginated list of forums ordered by most recent activity. */
    public CursorPage<Thread> list(String cursor, int limit) {
        Instant before = CursorPage.decodeCursor(cursor);
        PageRequest page = PageRequest.of(0, limit + 1);
        List<Thread> fetched = before == null
            ? threadRepository.findByOrderByLastActivityAtDesc(page)
            : threadRepository.findByLastActivityAtLessThanOrderByLastActivityAtDesc(before, page);
        return CursorPage.of(fetched, limit, Thread::getLastActivityAt);
    }

    public void touch(Thread thread) {
        thread.setPostCount(thread.getPostCount() + 1);
        thread.setLastActivityAt(Instant.now());
        threadRepository.save(thread);
    }
}
