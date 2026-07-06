package com.mtg.deckbuilder.forum.domain;

/** Category of a moderation flag raised by the automatic content-moderation engine. */
public enum FlagType {
    PROFANITY,
    HARASSMENT,
    SPAM,
    WIZARDS_VIOLATION,
    SLUR,
    OTHER
}
