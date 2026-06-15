package com.mtg.deckbuilder.forum.web;

import com.mtg.deckbuilder.forum.service.ForumService;
import com.mtg.deckbuilder.forum.service.PostService;
import com.mtg.deckbuilder.forum.web.dto.CreatePostRequest;
import com.mtg.deckbuilder.forum.web.dto.CreateThreadRequest;
import com.mtg.deckbuilder.forum.web.dto.CursorPage;
import com.mtg.deckbuilder.forum.web.dto.PostDto;
import com.mtg.deckbuilder.forum.web.dto.ThreadDto;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/forums")
public class ForumController {

    private final ForumService forumService;
    private final PostService postService;

    public ForumController(ForumService forumService, PostService postService) {
        this.forumService = forumService;
        this.postService = postService;
    }

    @GetMapping
    public CursorPage<ThreadDto> list(@RequestParam(required = false) String cursor,
                                      @RequestParam(defaultValue = "20") int limit) {
        CursorPage<com.mtg.deckbuilder.forum.domain.Thread> page = forumService.list(cursor, clamp(limit));
        return new CursorPage<>(page.items().stream().map(ThreadDto::from).toList(),
            page.nextCursor(), page.hasMore());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ThreadDto create(@RequestHeader("X-User-Id") UUID userId,
                            @RequestHeader(value = "X-User-Name", required = false) String userName,
                            @Valid @RequestBody CreateThreadRequest request) {
        return ThreadDto.from(forumService.create(userId, userName, request));
    }

    @GetMapping("/{id}")
    public ThreadDto get(@PathVariable String id) {
        return ThreadDto.from(forumService.get(id));
    }

    @GetMapping("/{id}/posts")
    public CursorPage<PostDto> posts(@PathVariable String id,
                                     @RequestParam(required = false) String cursor,
                                     @RequestParam(defaultValue = "20") int limit) {
        CursorPage<com.mtg.deckbuilder.forum.domain.Post> page =
            postService.listByThread(id, cursor, clamp(limit));
        return new CursorPage<>(page.items().stream().map(PostDto::from).toList(),
            page.nextCursor(), page.hasMore());
    }

    @PostMapping("/{id}/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public PostDto createPost(@PathVariable String id,
                              @RequestHeader("X-User-Id") UUID userId,
                              @Valid @RequestBody CreatePostRequest request) {
        return PostDto.from(postService.create(id, userId, request));
    }

    private static int clamp(int limit) {
        return Math.max(1, Math.min(limit, 50));
    }
}
