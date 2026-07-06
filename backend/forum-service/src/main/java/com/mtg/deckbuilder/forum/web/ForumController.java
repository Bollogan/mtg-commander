package com.mtg.deckbuilder.forum.web;

import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.domain.VoteTargetType;
import com.mtg.deckbuilder.forum.event.ForumEvent;
import com.mtg.deckbuilder.forum.event.ForumEventPublisher;
import com.mtg.deckbuilder.forum.service.ForumDiscoveryService;
import com.mtg.deckbuilder.forum.service.ForumService;
import com.mtg.deckbuilder.forum.service.PostService;
import com.mtg.deckbuilder.forum.service.VoteService;
import com.mtg.deckbuilder.forum.web.dto.CreatePostRequest;
import com.mtg.deckbuilder.forum.web.dto.CreateThreadRequest;
import com.mtg.deckbuilder.forum.web.dto.CursorPage;
import com.mtg.deckbuilder.forum.web.dto.DiscoveryRailsDto;
import com.mtg.deckbuilder.forum.web.dto.ForumSearchCriteria;
import com.mtg.deckbuilder.forum.web.dto.PostDto;
import com.mtg.deckbuilder.forum.web.dto.SearchResultPage;
import com.mtg.deckbuilder.forum.web.dto.ThreadDto;
import com.mtg.deckbuilder.forum.web.dto.VoteRequest;
import com.mtg.deckbuilder.forum.web.dto.VoteResultDto;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    private final ForumDiscoveryService discoveryService;
    private final VoteService voteService;
    private final ForumEventPublisher events;

    public ForumController(ForumService forumService, PostService postService,
                           ForumDiscoveryService discoveryService, VoteService voteService,
                           ForumEventPublisher events) {
        this.forumService = forumService;
        this.postService = postService;
        this.discoveryService = discoveryService;
        this.voteService = voteService;
        this.events = events;
    }

    @GetMapping
    public CursorPage<ThreadDto> list(@RequestHeader(value = "X-User-Id", required = false) UUID userId,
                                      @RequestParam(required = false) String cursor,
                                      @RequestParam(defaultValue = "20") int limit) {
        CursorPage<Thread> page = forumService.list(cursor, clamp(limit));
        return new CursorPage<>(toDtos(page.items(), userId), page.nextCursor(), page.hasMore());
    }

    /** The Trending / Rising / New rails that populate the discovery mosaic (spec §2.1). */
    @GetMapping("/rails")
    public DiscoveryRailsDto rails(@RequestHeader(value = "X-User-Id", required = false) UUID userId,
                                   @RequestParam(defaultValue = "12") int limit) {
        int n = clamp(limit);
        List<Thread> trending = discoveryService.trending(n);
        List<Thread> rising = discoveryService.rising(n);
        List<Thread> newest = discoveryService.newest(n);
        // One vote lookup across every card on the page, then map each rail with the caller's votes.
        List<Thread> all = new ArrayList<>(trending);
        all.addAll(rising);
        all.addAll(newest);
        Map<String, Integer> myVotes = myVotes(userId, all);
        return new DiscoveryRailsDto(
            toDtos(trending, myVotes), toDtos(rising, myVotes), toDtos(newest, myVotes));
    }

    /** Advanced forum search with field selection, filters and ordering (spec §2.3). */
    @GetMapping("/search")
    public SearchResultPage<ThreadDto> search(
            @RequestHeader(value = "X-User-Id", required = false) UUID userId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> searchIn,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String activityLevel,
            @RequestParam(required = false) Long minMembers,
            @RequestParam(required = false) Long maxMembers,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) Boolean nsfw,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Set<String> fields = searchIn == null ? Set.of() : Set.copyOf(searchIn);
        ForumSearchCriteria criteria = new ForumSearchCriteria(
            q, fields, category, activityLevel, minMembers, maxMembers, language, sortBy, nsfw,
            page, size);
        SearchResultPage<Thread> result = discoveryService.search(criteria);
        return new SearchResultPage<>(toDtos(result.items(), userId), result.total(),
            result.page(), result.size(), result.hasMore());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ThreadDto create(@RequestHeader("X-User-Id") UUID userId,
                            @RequestHeader(value = "X-User-Name", required = false) String userName,
                            @Valid @RequestBody CreateThreadRequest request) {
        return ThreadDto.from(forumService.create(userId, userName, request));
    }

    @GetMapping("/{id}")
    public ThreadDto get(@PathVariable String id,
                         @RequestHeader(value = "X-User-Id", required = false) UUID userId) {
        int myVote = userId == null ? 0
            : voteService.myVotes(VoteTargetType.FORUM, userId, List.of(id)).getOrDefault(id, 0);
        return ThreadDto.from(forumService.get(id), myVote);
    }

    /** Cast/toggle/clear the caller's up/down vote on a forum ({@code value} = 1 / -1 / 0). */
    @PostMapping("/{id}/vote")
    public VoteResultDto vote(@PathVariable String id,
                              @RequestHeader("X-User-Id") UUID userId,
                              @Valid @RequestBody VoteRequest request) {
        VoteResultDto result = voteService.vote(VoteTargetType.FORUM, id, userId, request.value());
        // Fan the refreshed tallies to the discovery stream so every open mosaic updates live.
        events.publish(ForumEvent.of("FORUM_VOTE", id).withVote(result.upvotes(), result.downvotes()));
        return result;
    }

    @GetMapping("/{id}/posts")
    public CursorPage<PostDto> posts(@PathVariable String id,
                                     @RequestHeader(value = "X-User-Id", required = false) UUID userId,
                                     @RequestParam(required = false) String cursor,
                                     @RequestParam(defaultValue = "20") int limit) {
        CursorPage<Post> page = postService.listByThread(id, cursor, clamp(limit));
        List<Post> items = page.items();
        Map<String, Integer> myVotes = userId == null ? Map.of()
            : voteService.myVotes(VoteTargetType.POST, userId, items.stream().map(Post::getId).toList());
        return new CursorPage<>(
            items.stream().map(p -> PostDto.from(p, myVotes.getOrDefault(p.getId(), 0))).toList(),
            page.nextCursor(), page.hasMore());
    }

    @PostMapping("/{id}/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public PostDto createPost(@PathVariable String id,
                              @RequestHeader("X-User-Id") UUID userId,
                              @Valid @RequestBody CreatePostRequest request) {
        return PostDto.from(postService.create(id, userId, request));
    }

    /** Resolves the caller's forum votes, then maps each forum to a DTO carrying its {@code myVote}. */
    private List<ThreadDto> toDtos(List<Thread> forums, UUID userId) {
        return toDtos(forums, myVotes(userId, forums));
    }

    private static List<ThreadDto> toDtos(List<Thread> forums, Map<String, Integer> myVotes) {
        return forums.stream()
            .map(t -> ThreadDto.from(t, myVotes.getOrDefault(t.getId(), 0)))
            .toList();
    }

    private Map<String, Integer> myVotes(UUID userId, List<Thread> forums) {
        return userId == null ? Map.of()
            : voteService.myVotes(VoteTargetType.FORUM, userId, forums.stream().map(Thread::getId).toList());
    }

    private static int clamp(int limit) {
        return Math.max(1, Math.min(limit, 50));
    }
}
