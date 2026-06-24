package com.mtg.deckbuilder.ai.web;

import com.mtg.deckbuilder.ai.service.RecommendationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class RecommendController {

  private final RecommendationService recommendationService;

  public RecommendController(RecommendationService recommendationService) {
    this.recommendationService = recommendationService;
  }

  @PostMapping("/recommend")
  public RecommendResponse recommend(@Valid @RequestBody RecommendRequest request) {
    return recommendationService.recommend(request);
  }
}
