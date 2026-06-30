package com.mtg.deckbuilder.auth;

import jakarta.validation.constraints.NotBlank;

/** Payload for Google Sign-In: the ID token (JWT credential) issued by Google Identity Services. */
public record GoogleAuthRequest(@NotBlank String idToken) {
}
