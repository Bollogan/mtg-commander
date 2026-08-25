package com.mtg.deckbuilder.deck.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtg.deckbuilder.deck.domain.DeckVisibility;
import com.mtg.deckbuilder.deck.service.DeckLegalityService;
import com.mtg.deckbuilder.deck.scryfall.ScryfallAutocompleteItem;
import com.mtg.deckbuilder.deck.scryfall.ScryfallClient;
import com.mtg.deckbuilder.deck.service.CategoryTemplateService;
import com.mtg.deckbuilder.deck.service.DeckService;
import com.mtg.deckbuilder.deck.service.SuggestionService;
import com.mtg.deckbuilder.deck.web.dto.DeckDto;
import com.mtg.deckbuilder.deck.web.dto.DeckRequest;
import com.mtg.deckbuilder.deck.scryfall.ScryfallCard;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(DeckController.class)
class DeckControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @MockBean
  private DeckService deckService;

  @MockBean
  private SuggestionService suggestionService;

  @MockBean
  private ScryfallClient scryfallClient;

  @MockBean
  private DeckLegalityService legalityService;

  @MockBean
  private CategoryTemplateService templateService;

  private static ScryfallCard card(String id, String name) {
    return new ScryfallCard(id, name, "{1}", 1, List.of(), List.of(), "Artifact", "",
        null, null, null, "LTC", "uncommon", Map.of(), null);
  }

  @Test
  void namedLookupAcceptsAFuzzyName() throws Exception {
    when(scryfallClient.getCardByFuzzyName("sol rng")).thenReturn(card("sol", "Sol Ring"));

    mockMvc.perform(get("/api/decks/cards/named").param("fuzzy", "sol rng"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Sol Ring"));
  }

  @Test
  void namedLookupRejectsARequestWithNeitherExactNorFuzzy() throws Exception {
    mockMvc.perform(get("/api/decks/cards/named"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void bulkNameResolutionReportsFoundAndMissingNames() throws Exception {
    when(scryfallClient.getCardsByNames(List.of("Sol Ring", "Nonexistent Card")))
        .thenReturn(Map.of("sol ring", card("sol", "Sol Ring")));
    when(scryfallClient.getCardByFuzzyName("Nonexistent Card")).thenReturn(null);

    mockMvc.perform(post("/api/decks/cards/named-collection")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"names\":[\"Sol Ring\",\"Nonexistent Card\"]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resolved[0].requested").value("Sol Ring"))
        .andExpect(jsonPath("$.resolved[0].card.name").value("Sol Ring"))
        .andExpect(jsonPath("$.unresolved[0]").value("Nonexistent Card"));
  }

  @Test
  void autocompleteReturnsItems() throws Exception {
    when(scryfallClient.autocomplete("sol", 8, false)).thenReturn(List.of(
        new ScryfallAutocompleteItem("sol", "Sol Ring", "{1}", "Artifact", "http://img")));

    mockMvc.perform(get("/api/decks/cards/autocomplete")
            .param("q", "sol")
            .param("limit", "8"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").value("Sol Ring"));
  }

  @Test
  void createDeckReturnsCreatedDeck() throws Exception {
    UUID ownerId = UUID.randomUUID();
    DeckRequest request = new DeckRequest(
        "Test",
        "commander",
        DeckVisibility.PRIVATE,
        null,
        null,
        List.of(),
        List.of());

    DeckDto dto = new DeckDto(
        "deck1", ownerId, "User", null, "Test", "commander",
        DeckVisibility.PRIVATE, null, null, List.of(), List.of(), null,
        0L, 0, false,
        Instant.now(), Instant.now());

    when(deckService.create(any(), any(), any())).thenReturn(dto);

    mockMvc.perform(post("/api/decks")
            .header("X-User-Id", ownerId.toString())
            .header("X-User-Name", "User")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("Test"));
  }
}
