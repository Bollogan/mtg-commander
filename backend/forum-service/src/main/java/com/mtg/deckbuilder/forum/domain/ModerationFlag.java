package com.mtg.deckbuilder.forum.domain;

import java.time.Instant;
import java.util.List;

/**
 * A single moderation signal attached to content, embedded on the flagged document.
 * {@code confidence} is the detector's 0..1 score; {@code detectedWords} lists the matches.
 */
public class ModerationFlag {

    private FlagType type;
    private double confidence;
    private List<String> detectedWords;
    private String detectedLanguage;
    private Instant createdAt;

    public ModerationFlag() {
    }

    public ModerationFlag(FlagType type, double confidence, List<String> detectedWords,
                          String detectedLanguage, Instant createdAt) {
        this.type = type;
        this.confidence = confidence;
        this.detectedWords = detectedWords;
        this.detectedLanguage = detectedLanguage;
        this.createdAt = createdAt;
    }

    public FlagType getType() {
        return type;
    }

    public void setType(FlagType type) {
        this.type = type;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public List<String> getDetectedWords() {
        return detectedWords;
    }

    public void setDetectedWords(List<String> detectedWords) {
        this.detectedWords = detectedWords;
    }

    public String getDetectedLanguage() {
        return detectedLanguage;
    }

    public void setDetectedLanguage(String detectedLanguage) {
        this.detectedLanguage = detectedLanguage;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
