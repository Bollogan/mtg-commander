package com.mtg.deckbuilder.forum.web;

import com.mtg.deckbuilder.forum.service.CommentService;
import com.mtg.deckbuilder.forum.service.PostService;
import com.mtg.deckbuilder.forum.web.dto.CommentDto;
import com.mtg.deckbuilder.forum.web.dto.CreateCommentRequest;
import com.mtg.deckbuilder.forum.web.dto.CursorPage;
import com.mtg.deckbuilder.forum.web.dto.PostDto;
import jakarta.validation.Valid;
import java.util.List;
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
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;
    private final CommentService commentService;

    public PostController(PostService postService, CommentService commentService) {
        this.postService = postService;
        this.commentService = commentService;
    }

    @GetMapping("/{id}")
    public PostDto get(@PathVariable String id) {
        return PostDto.from(postService.get(id));
    }

    /** Recent posts by a set of authors — consumed by user-service to build a follower feed. */
    @GetMapping("/by-authors")
    public List<PostDto> byAuthors(@RequestParam("authorIds") List<UUID> authorIds,
                                   @RequestParam(value = "limit", defaultValue = "30") int limit) {
        return postService.byAuthors(authorIds, limit).stream().map(PostDto::from).toList();
    }

    @GetMapping("/{id}/comments")
    public CursorPage<CommentDto> comments(@PathVariable String id,
                                           @RequestParam(required = false) String cursor,
                                           @RequestParam(defaultValue = "20") int limit) {
        CursorPage<com.mtg.deckbuilder.forum.domain.Comment> page =
            commentService.list(id, cursor, Math.max(1, Math.min(limit, 50)));
        return new CursorPage<>(page.items().stream().map(CommentDto::from).toList(),
            page.nextCursor(), page.hasMore());
    }

    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentDto createComment(@PathVariable String id,
                                    @RequestHeader("X-User-Id") UUID userId,
                                    @Valid @RequestBody CreateCommentRequest request) {
        return CommentDto.from(commentService.create(id, userId, request));
    }
}
