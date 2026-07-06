package com.mtg.deckbuilder.forum.domain;

/** What a {@link Vote} is cast on: a {@link Thread} forum, a top-level {@link Post} or a {@link Comment} reply. */
public enum VoteTargetType {
    FORUM,
    POST,
    COMMENT
}
