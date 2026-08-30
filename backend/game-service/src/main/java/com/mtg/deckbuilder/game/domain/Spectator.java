package com.mtg.deckbuilder.game.domain;

/** Someone watching the table without a seat. Spectators may chat but never act. */
public record Spectator(String userId, String userName) {
}
