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
import java.time.Instant;
import java.util.List;
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
