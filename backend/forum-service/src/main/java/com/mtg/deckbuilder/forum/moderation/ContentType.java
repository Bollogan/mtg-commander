package com.mtg.deckbuilder.forum.moderation;

/** What kind of user content is being moderated — lets the engine tune strictness by surface. */
public enum ContentType {
    FORUM_NAME,
    FORUM_DESCRIPTION,
    THREAD_CREATION,
    POST_CREATION
}
