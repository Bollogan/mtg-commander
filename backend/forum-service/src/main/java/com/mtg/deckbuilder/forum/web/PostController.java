package com.mtg.deckbuilder.forum.web;

import com.mtg.deckbuilder.forum.domain.Comment;
import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.domain.VoteTargetType;
import com.mtg.deckbuilder.forum.service.CommentService;
import com.mtg.deckbuilder.forum.service.PostService;
import com.mtg.deckbuilder.forum.service.VoteService;
import com.mtg.deckbuilder.forum.web.dto.CommentDto;
import com.mtg.deckbuilder.forum.web.dto.CreateCommentRequest;
import com.mtg.deckbuilder.forum.web.dto.CursorPage;
import com.mtg.deckbuilder.forum.web.dto.PostDto;
import com.mtg.deckbuilder.forum.web.dto.VoteRequest;
import com.mtg.deckbuilder.forum.web.dto.VoteResultDto;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
    private final VoteService voteService;

    public PostController(PostService postService, CommentService commentService,
                          VoteService voteService) {
        this.postService = postService;
        this.commentService = commentService;
        this.voteService = voteService;
    }

    @GetMapping("/{id}")
    public PostDto get(@PathVariable String id,
                       @RequestHeader(value = "X-User-Id", required = false) UUID userId) {
        Post post = postService.get(id);
        int myVote = userId == null ? 0
            : voteService.myVotes(VoteTargetType.POST, userId, List.of(id)).getOrDefault(id, 0);
        return PostDto.from(post, myVote);
    }

    /** Recent posts by a set of authors — consumed by user-service to build a follower feed. */
    @GetMapping("/by-authors")
    public List<PostDto> byAuthors(@RequestParam("authorIds") List<UUID> authorIds,
                                   @RequestParam(value = "limit", defaultValue = "30") int limit) {
        return postService.byAuthors(authorIds, limit).stream().map(PostDto::from).toList();
    }

    @GetMapping("/{id}/comments")
    public CursorPage<CommentDto> comments(@PathVariable String id,
                                           @RequestHeader(value = "X-User-Id", required = false) UUID userId,
                                           @RequestParam(required = false) String cursor,
                                           @RequestParam(defaultValue = "50") int limit) {
        CursorPage<Comment> page = commentService.list(id, cursor, Math.max(1, Math.min(limit, 200)));
        List<Comment> items = page.items();
        Map<String, Integer> myVotes = userId == null ? Map.of()
            : voteService.myVotes(VoteTargetType.COMMENT, userId, items.stream().map(Comment::getId).toList());
        return new CursorPage<>(
            items.stream().map(c -> CommentDto.from(c, myVotes.getOrDefault(c.getId(), 0))).toList(),
            page.nextCursor(), page.hasMore());
    }

    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentDto createComment(@PathVariable String id,
                                    @RequestHeader("X-User-Id") UUID userId,
                                    @Valid @RequestBody CreateCommentRequest request) {
        return CommentDto.from(commentService.create(id, userId, request));
    }

    /** Cast/toggle/clear the caller's up/down vote on a post ({@code value} = 1 / -1 / 0). */
    @PostMapping("/{id}/vote")
    public VoteResultDto vote(@PathVariable String id,
                              @RequestHeader("X-User-Id") UUID userId,
                              @Valid @RequestBody VoteRequest request) {
        return voteService.vote(VoteTargetType.POST, id, userId, request.value());
    }
}
