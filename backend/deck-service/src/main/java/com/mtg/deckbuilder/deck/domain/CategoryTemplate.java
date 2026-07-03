package com.mtg.deckbuilder.deck.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Reusable category template. Can be owned by a user or be global (ownerId == null).
 */
@Document(collection = "category_templates")
public class CategoryTemplate {

  @Id
  private String id;

  @Indexed
  private UUID ownerId;

  private String name;
  private List<DeckCategory> categories = new ArrayList<>();
  private boolean global;
  private Instant createdAt;
  private Instant updatedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public UUID getOwnerId() {
    return ownerId;
  }

  public void setOwnerId(UUID ownerId) {
    this.ownerId = ownerId;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public List<DeckCategory> getCategories() {
    return categories;
  }

  public void setCategories(List<DeckCategory> categories) {
    this.categories = categories == null ? new ArrayList<>() : categories;
  }

  public boolean isGlobal() {
    return global;
  }

  public void setGlobal(boolean global) {
    this.global = global;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
