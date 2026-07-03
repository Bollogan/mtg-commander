package com.mtg.deckbuilder.deck.web.dto;

/**
 * Aggregated deck price across Scryfall's market sources. Non-foil totals come straight from
 * TCGplayer (USD) and Cardmarket (EUR); foil totals use each card's foil price where available
 * and fall back to its non-foil price otherwise. {@code missingUsd/missingEur} count card copies
 * with no price in that source, so the UI can flag an incomplete total.
 */
public record DeckPricesDto(
    double usd,
    double usdFoil,
    double eur,
    double eurFoil,
    double tix,
    int missingUsd,
    int missingEur,
    int totalCards) {
}
