package com.mtg.deckbuilder.forum.moderation;

import static org.assertj.core.api.Assertions.assertThat;

import com.mtg.deckbuilder.forum.domain.FlagType;
import org.junit.jupiter.api.Test;

class ModerationServiceTest {

    // Default thresholds from Fase_modulo_foro.md §5.2: block 0.85 / pending 0.60 / flag 0.40.
    private final ModerationService service = new ModerationService(0.85, 0.60, 0.40);

    @Test
    void cleanContentIsAllowed() {
        ModerationResult r = service.moderate("Deck de Commander para principiantes", ContentType.FORUM_NAME);
        assertThat(r.action()).isEqualTo(ModerationAction.ALLOW);
        assertThat(r.flags()).isEmpty();
    }

    @Test
    void blankContentIsAllowed() {
        assertThat(service.moderate(null, ContentType.POST_CREATION).action()).isEqualTo(ModerationAction.ALLOW);
        assertThat(service.moderate("   ", ContentType.POST_CREATION).action()).isEqualTo(ModerationAction.ALLOW);
    }

    @Test
    void slurIsBlockedOutright() {
        ModerationResult r = service.moderate("you slurwordone here", ContentType.POST_CREATION);
        assertThat(r.isBlocked()).isTrue();
        assertThat(r.flags()).extracting(f -> f.getType()).contains(FlagType.SLUR);
    }

    @Test
    void mildProfanityInAPostIsPublishedButFlagged() {
        ModerationResult r = service.moderate("This is fucking great value", ContentType.POST_CREATION);
        assertThat(r.action()).isEqualTo(ModerationAction.ALLOW); // 0.50 < 0.60 pending bar for posts
        assertThat(r.flags()).extracting(f -> f.getType()).contains(FlagType.PROFANITY);
    }

    @Test
    void profanityInAForumNameIsHeldForReview() {
        // Public-facing surfaces drop the pending bar by 0.10, so a single hit (0.50) is held.
        ModerationResult r = service.moderate("puta madre", ContentType.FORUM_NAME);
        assertThat(r.needsReview()).isTrue();
    }

    @Test
    void repeatedWizardsViolationsAreBlocked() {
        ModerationResult r = service.moderate("counterfeit proxies for sale", ContentType.FORUM_DESCRIPTION);
        assertThat(r.isBlocked()).isTrue();
        assertThat(r.flags()).extracting(f -> f.getType()).contains(FlagType.WIZARDS_VIOLATION);
    }

    @Test
    void accentsAndCaseAreNormalisedBeforeMatching() {
        ModerationResult r = service.moderate("GILIPOLLAS", ContentType.FORUM_NAME);
        assertThat(r.flags()).extracting(f -> f.getType()).contains(FlagType.PROFANITY);
    }

    @Test
    void normalizeStripsAccentsAndPunctuation() {
        assertThat(ModerationService.normalize("¡Hólá, Múndo!")).isEqualTo("hola mundo");
    }
}
