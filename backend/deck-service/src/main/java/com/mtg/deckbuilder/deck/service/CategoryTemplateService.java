package com.mtg.deckbuilder.deck.service;

import com.mtg.deckbuilder.deck.domain.CategoryTemplate;
import com.mtg.deckbuilder.deck.domain.DeckCategory;
import com.mtg.deckbuilder.deck.repo.CategoryTemplateRepository;
import com.mtg.deckbuilder.deck.web.ApiExceptions.ForbiddenException;
import com.mtg.deckbuilder.deck.web.ApiExceptions.NotFoundException;
import com.mtg.deckbuilder.deck.web.dto.CategoryTemplateDto;
import com.mtg.deckbuilder.deck.web.dto.DeckCategoryDto;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CategoryTemplateService {

  private final CategoryTemplateRepository templateRepository;

  public CategoryTemplateService(CategoryTemplateRepository templateRepository) {
    this.templateRepository = templateRepository;
  }

  public List<CategoryTemplateDto> listForUser(UUID ownerId) {
    return templateRepository.findByOwnerIdOrGlobalTrueOrderByNameAsc(ownerId)
        .stream()
        .map(CategoryTemplateDto::from)
        .toList();
  }

  public CategoryTemplateDto create(UUID ownerId, String name, List<DeckCategoryDto> categories) {
    CategoryTemplate template = new CategoryTemplate();
    template.setOwnerId(ownerId);
    template.setName(name);
    template.setCategories(categories == null ? List.of() : categories.stream().map(DeckCategoryDto::toDomain).toList());
    template.setGlobal(false);
    template.setCreatedAt(Instant.now());
    template.setUpdatedAt(Instant.now());
    return CategoryTemplateDto.from(templateRepository.save(template));
  }

  public void delete(String id, UUID requesterId) {
    CategoryTemplate template = templateRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("Template not found: " + id));
    if (template.isGlobal() || !requesterId.equals(template.getOwnerId())) {
      throw new ForbiddenException("Only the owner can delete this template");
    }
    templateRepository.delete(template);
  }

  public List<DeckCategory> resolveCategories(String templateId) {
    if (templateId == null || templateId.isBlank()) {
      return List.of();
    }
    CategoryTemplate template = templateRepository.findById(templateId)
        .orElseThrow(() -> new NotFoundException("Template not found: " + templateId));
    return template.getCategories();
  }
}
