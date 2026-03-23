package com.mtg.deckbuilder.dto;

import java.util.List;

public record CardIdRequestDto(
    List<String> ids
) {
}
