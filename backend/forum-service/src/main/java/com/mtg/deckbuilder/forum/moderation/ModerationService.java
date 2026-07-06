package com.mtg.deckbuilder.forum.moderation;

import com.mtg.deckbuilder.forum.domain.FlagType;
import com.mtg.deckbuilder.forum.domain.ModerationFlag;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Local, dependency-free multilingual content moderation. A fast pre-filter (regex/word matching)
 * over accent- and case-normalised text, scored per {@link FlagType}, mapped to a
 * {@link ModerationAction} via confidence thresholds (see {@code Fase_modulo_foro.md} §5).
 *
 * <p>Word lists here are intentionally compact, illustrative starting points covering ES/EN; they
 * are meant to be extended (or externalised to config) without touching the pipeline. No external
 * API or LLM is used — this is the MVP engine chosen for the forum revamp.
 */
@Service
public class ModerationService {

    private static final Pattern URL = Pattern.compile("https?://|www\\.", Pattern.CASE_INSENSITIVE);
    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9\\s]");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    /** Spanish function words used for a naive language guess (ES vs. default EN). */
    private static final Set<String> ES_MARKERS =
        Set.of("el", "la", "los", "las", "una", "que", "de", "por", "para", "con", "es", "muy", "esta");

    // Base confidence contributed by a single match of each category (additional matches add 0.1).
    private static final Map<FlagType, Double> WEIGHTS = Map.of(
        FlagType.SLUR, 0.90,
        FlagType.WIZARDS_VIOLATION, 0.80,
        FlagType.HARASSMENT, 0.70,
        FlagType.PROFANITY, 0.50,
        FlagType.SPAM, 0.45);

    // ── Word lists (normalised, no accents). Multi-word entries are matched as substrings. ──
    private static final Map<FlagType, Set<String>> WORD_LISTS = new LinkedHashMap<>();

    static {
        WORD_LISTS.put(FlagType.PROFANITY, Set.of(
            // ES
            "mierda", "gilipollas", "cabron", "puta", "puto", "joder", "imbecil", "subnormal",
            // EN
            "shit", "asshole", "bitch", "fuck", "fucking", "bastard", "dumbass"));
        WORD_LISTS.put(FlagType.HARASSMENT, Set.of(
            // ES
            "matate", "muerete", "eres basura", "nadie te quiere",
            // EN
            "kill yourself", "kys", "you should die", "worthless loser"));
        WORD_LISTS.put(FlagType.SLUR, Set.of(
            // Real slur lists are maintained externally; these single-token placeholders (which
            // survive normalisation) exercise the pipeline without embedding actual slurs.
            "slurwordone", "slurwordtwo"));
        WORD_LISTS.put(FlagType.WIZARDS_VIOLATION, Set.of(
            // Counterfeit/proxy sales, doxxing, hate — against WotC community policies.
            "counterfeit", "proxies for sale", "proxy for sale", "cartas falsas a la venta",
            "doxx", "dox you", "nazi", "heil"));
    }

    private final double autoBlock;
    private final double pendingReview;
    private final double flagForInfo;

    public ModerationService(
        @Value("${moderation.threshold.block:0.85}") double autoBlock,
        @Value("${moderation.threshold.pending:0.60}") double pendingReview,
        @Value("${moderation.threshold.flag:0.40}") double flagForInfo) {
        this.autoBlock = autoBlock;
        this.pendingReview = pendingReview;
        this.flagForInfo = flagForInfo;
    }

    /** Moderates a single piece of text; {@code null}/blank content is always allowed. */
    public ModerationResult moderate(String text, ContentType type) {
        if (text == null || text.isBlank()) {
            return ModerationResult.allow();
        }
        String normalized = normalize(text);
        String language = detectLanguage(normalized);
        Set<String> tokens = new LinkedHashSet<>(List.of(SPACES.split(normalized)));

        List<ModerationFlag> flags = new ArrayList<>();
        double maxConfidence = 0.0;

        for (Map.Entry<FlagType, Set<String>> entry : WORD_LISTS.entrySet()) {
            List<String> hits = new ArrayList<>();
            for (String term : entry.getValue()) {
                boolean matched = term.contains(" ")
                    ? normalized.contains(term)          // phrase → substring
                    : tokens.contains(term);             // single word → whole-token
                if (matched) {
                    hits.add(term);
                }
            }
            if (!hits.isEmpty()) {
                double confidence = score(entry.getKey(), hits.size());
                maxConfidence = Math.max(maxConfidence, confidence);
                flags.add(new ModerationFlag(entry.getKey(), confidence, hits, language, Instant.now()));
            }
        }

        // Spam heuristic: several links, or shouting (mostly uppercase over a decent length).
        double spam = spamScore(text);
        if (spam >= flagForInfo) {
            maxConfidence = Math.max(maxConfidence, spam);
            flags.add(new ModerationFlag(FlagType.SPAM, spam, List.of("spam-heuristic"), language, Instant.now()));
        }

        return decide(maxConfidence, flags, type);
    }

    private ModerationResult decide(double confidence, List<ModerationFlag> flags, ContentType type) {
        // Forum names/descriptions are public-facing surfaces: hold borderline cases a notch sooner.
        double pendingCut = (type == ContentType.FORUM_NAME || type == ContentType.FORUM_DESCRIPTION)
            ? pendingReview - 0.10 : pendingReview;

        if (confidence >= autoBlock) {
            return new ModerationResult(ModerationAction.BLOCK, confidence, flags,
                "Content blocked automatically (" + describe(flags) + ")");
        }
        if (confidence >= pendingCut) {
            return new ModerationResult(ModerationAction.PENDING_REVIEW, confidence, flags,
                "Held for moderator review (" + describe(flags) + ")");
        }
        // Below the review bar: publish, keeping any soft flags for context.
        List<ModerationFlag> soft = confidence >= flagForInfo ? flags : List.of();
        return new ModerationResult(ModerationAction.ALLOW, confidence, soft, null);
    }

    private double score(FlagType type, int matches) {
        double base = WEIGHTS.getOrDefault(type, 0.5);
        return Math.min(1.0, base + 0.10 * (matches - 1));
    }

    private double spamScore(String raw) {
        long links = URL.matcher(raw).results().count();
        double score = 0.0;
        if (links >= 3) {
            score = 0.6;
        } else if (links == 2) {
            score = 0.45;
        }
        long letters = raw.chars().filter(Character::isLetter).count();
        long upper = raw.chars().filter(Character::isUpperCase).count();
        if (letters >= 20 && upper > letters * 0.7) {
            score = Math.max(score, 0.45); // shouting
        }
        return score;
    }

    private String describe(List<ModerationFlag> flags) {
        return flags.stream().map(f -> f.getType().name().toLowerCase())
            .distinct().reduce((a, b) -> a + ", " + b).orElse("policy");
    }

    private String detectLanguage(String normalized) {
        Set<String> tokens = Set.of(SPACES.split(normalized));
        long esHits = ES_MARKERS.stream().filter(tokens::contains).count();
        return esHits >= 2 ? "es" : "en";
    }

    /** Lowercase, strip diacritics, drop punctuation → a clean token stream for matching. */
    static String normalize(String text) {
        String lower = text.toLowerCase();
        String noAccents = Normalizer.normalize(lower, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return SPACES.matcher(NON_WORD.matcher(noAccents).replaceAll(" ")).replaceAll(" ").trim();
    }
}
