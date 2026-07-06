package com.mtg.deckbuilder.forum.web;

import com.mtg.deckbuilder.forum.domain.VoteTargetType;
import com.mtg.deckbuilder.forum.service.VoteService;
import com.mtg.deckbuilder.forum.web.dto.VoteRequest;
import com.mtg.deckbuilder.forum.web.dto.VoteResultDto;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final VoteService voteService;

    public CommentController(VoteService voteService) {
        this.voteService = voteService;
    }

    /** Cast/toggle/clear the caller's up/down vote on a comment ({@code value} = 1 / -1 / 0). */
    @PostMapping("/{id}/vote")
    public VoteResultDto vote(@PathVariable String id,
                              @RequestHeader("X-User-Id") UUID userId,
                              @Valid @RequestBody VoteRequest request) {
        return voteService.vote(VoteTargetType.COMMENT, id, userId, request.value());
    }
}
