package com.mtg.deckbuilder.forum.web.dto;

/** The tallies of a target after a vote, plus the caller's own current vote ({@code myVote}). */
public record VoteResultDto(long upvotes, long downvotes, long score, int myVote) {

    public static VoteResultDto of(long upvotes, long downvotes, int myVote) {
        return new VoteResultDto(upvotes, downvotes, upvotes - downvotes, myVote);
    }
}
