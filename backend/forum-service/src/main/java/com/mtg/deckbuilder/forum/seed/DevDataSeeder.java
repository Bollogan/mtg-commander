package com.mtg.deckbuilder.forum.seed;

import com.mtg.deckbuilder.forum.domain.Comment;
import com.mtg.deckbuilder.forum.domain.ForumSettings;
import com.mtg.deckbuilder.forum.domain.Post;
import com.mtg.deckbuilder.forum.domain.Thread;
import com.mtg.deckbuilder.forum.domain.Vote;
import com.mtg.deckbuilder.forum.domain.VoteTargetType;
import com.mtg.deckbuilder.forum.repo.CommentRepository;
import com.mtg.deckbuilder.forum.repo.PostRepository;
import com.mtg.deckbuilder.forum.repo.ThreadRepository;
import com.mtg.deckbuilder.forum.repo.VoteRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Populates MongoDB with a lively demo dataset — a handful of forums, threads (posts), deeply
 * nested replies and up/down votes — so the forum module can be explored locally with realistic
 * content. Runs only under the {@code seed} Spring profile and only when the forum collection is
 * empty, so it never clobbers real data or re-seeds on restart.
 *
 * <p>Authors are synthetic: the forum service denormalises author name/avatar at write time, so
 * these render correctly without corresponding accounts in user-service. Votes are attributed to
 * the same synthetic users purely to keep the {@code upvotes}/{@code downvotes} tallies consistent.
 */
@Component
@Profile("seed")
public class DevDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private final ThreadRepository threadRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final VoteRepository voteRepository;

    private final Instant now = Instant.now();

    public DevDataSeeder(ThreadRepository threadRepository,
                         PostRepository postRepository,
                         CommentRepository commentRepository,
                         VoteRepository voteRepository) {
        this.threadRepository = threadRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.voteRepository = voteRepository;
    }

    /** A demo forum member. {@code id} is stable so re-seeds (on a wiped DB) stay deterministic. */
    private record DemoUser(UUID id, String name, String avatar) {
        static DemoUser of(String seed, String name) {
            return new DemoUser(UUID.nameUUIDFromBytes(("mtg-demo:" + seed).getBytes()), name,
                "https://api.dicebear.com/7.x/bottts/svg?seed=" + seed);
        }
    }

    private static final DemoUser JHOIRA = DemoUser.of("jhoira", "Jhoira of the Ghitu");
    private static final DemoUser CHANDRA = DemoUser.of("chandra", "Chandra Nalaar");
    private static final DemoUser TEFERI = DemoUser.of("teferi", "Teferi Akosa");
    private static final DemoUser NISSA = DemoUser.of("nissa", "Nissa Revane");
    private static final DemoUser LILIANA = DemoUser.of("liliana", "Liliana Vess");
    private static final DemoUser GIDEON = DemoUser.of("gideon", "Gideon Jura");
    private static final DemoUser KAYA = DemoUser.of("kaya", "Kaya, Ghost Assassin");
    private static final DemoUser RAL = DemoUser.of("ral", "Ral Zarek");

    private static final List<DemoUser> EVERYONE =
        List.of(JHOIRA, CHANDRA, TEFERI, NISSA, LILIANA, GIDEON, KAYA, RAL);

    @Override
    public void run(String... args) {
        if (threadRepository.count() > 0) {
            log.info("Forum seed skipped: {} forums already present.", threadRepository.count());
            return;
        }
        log.info("Seeding demo forum data…");

        seedCommanderForum();
        seedRulesForum();
        seedBudgetForum();
        seedLoreForum();

        log.info("Forum seed complete: {} forums, {} posts, {} comments, {} votes.",
            threadRepository.count(), postRepository.count(),
            commentRepository.count(), voteRepository.count());
    }

    // ── Forum 1: Commander strategy ──────────────────────────────────────────

    private void seedCommanderForum() {
        Thread forum = forum("Commander HQ", "commander-hq",
            "High-power EDH, deck techs and the endless quest for the perfect 100.",
            "DECK_DISCUSSION", JHOIRA, List.of("commander", "edh", "strategy"), days(40));

        Post p1 = post(forum, TEFERI, "Best budget staples under $5 in 2026?",
            "I'm rebuilding my collection and want to know which sub-$5 cards punch way above their "
                + "price. Sol Ring aside, what are your auto-includes right now?", hours(6));
        Comment c1 = comment(p1, null, CHANDRA,
            "Arcane Signet, Command Tower and Cultivate are non-negotiable for me.", hours(5));
        Comment c1a = comment(p1, c1, NISSA,
            "Cultivate over Kodama's Reach? I go back and forth on those two constantly.", hours(4));
        comment(p1, c1a, CHANDRA,
            "Reach puts the second land in the graveyard which is better with certain payoffs, but "
                + "Cultivate ramps the same. Basically a wash — run both.", hours(3));
        comment(p1, c1, GIDEON, "Don't sleep on Swiftfoot Boots. Protecting your commander is value.",
            hours(3));
        comment(p1, null, LILIANA,
            "Reliquary Tower if you're a big-draw deck. Nothing worse than discarding to hand size.",
            hours(2));
        votes(VoteTargetType.POST, p1, List.of(CHANDRA, NISSA, GIDEON, LILIANA, RAL), List.of());
        votes(VoteTargetType.COMMENT, c1, List.of(TEFERI, NISSA, RAL, GIDEON), List.of());
        votes(VoteTargetType.COMMENT, c1a, List.of(CHANDRA), List.of(RAL));

        Post p2 = post(forum, RAL, "Is [[Dockside Extortionist]] too strong for casual tables?",
            "My playgroup is talking about a soft ban. It's a two-mana rock that often makes 6+ "
                + "treasures. Where do you draw the line between 'strong' and 'unfun'?", days(2));
        Comment c2 = comment(p2, null, GIDEON,
            "It's a symptom, not the disease. The issue is unbounded mana + a combo payoff.", days(2));
        comment(p2, c2, RAL, "Fair. We don't run many combos so it just feels like free ramp.", days(1));
        comment(p2, null, KAYA, "Soft bans breed resentment. Just talk power level before you shuffle up.",
            hours(20));
        votes(VoteTargetType.POST, p2, List.of(GIDEON, KAYA, TEFERI), List.of(CHANDRA));
        votes(VoteTargetType.COMMENT, c2, List.of(RAL, KAYA, TEFERI, NISSA), List.of());

        votes(VoteTargetType.FORUM, forum, List.of(CHANDRA, TEFERI, NISSA, GIDEON, KAYA, RAL), List.of(LILIANA));
        finalizeForum(forum);
    }

    // ── Forum 2: Rules & rulings ─────────────────────────────────────────────

    private void seedRulesForum() {
        Thread forum = forum("Rules Lawyers", "rules-lawyers",
            "Priority, the stack, layers and every corner case the comprehensive rules can throw.",
            "RULES", TEFERI, List.of("rules", "judge", "stack"), days(60));

        Post p1 = post(forum, NISSA, "Does a copied spell get put on the stack or resolve immediately?",
            "If I copy a spell with something like Fork, does the copy go on the stack above the "
                + "original? Trying to sequence a counter war correctly.", hours(9));
        Comment c1 = comment(p1, null, TEFERI,
            "The copy is created directly on the stack — it's never cast, so it can't be countered "
                + "by 'counter target spell you cast'. It resolves before the original.", hours(8));
        Comment c1a = comment(p1, c1, NISSA, "That's the bit I always forget — thanks!", hours(7));
        comment(p1, c1a, TEFERI, "Happens to everyone. Rule 707.10 if you want the exact wording.",
            hours(6));
        votes(VoteTargetType.POST, p1, List.of(TEFERI, GIDEON, RAL), List.of());
        votes(VoteTargetType.COMMENT, c1, List.of(NISSA, GIDEON, RAL, KAYA, JHOIRA), List.of());

        Post p2 = post(forum, GIDEON, "Layers question: two effects setting power to a fixed value",
            "If one effect sets my creature's power to 3 and a later one sets it to 5, which wins? "
                + "I know it's layer 7b but timestamp order always trips me up.", days(3));
        comment(p2, null, TEFERI, "Same layer, so timestamps decide: the later effect (5) wins.",
            days(3));
        votes(VoteTargetType.POST, p2, List.of(TEFERI, NISSA), List.of());

        votes(VoteTargetType.FORUM, forum, List.of(NISSA, GIDEON, RAL, KAYA), List.of());
        finalizeForum(forum);
    }

    // ── Forum 3: Budget brewing ──────────────────────────────────────────────

    private void seedBudgetForum() {
        Thread forum = forum("Budget Brewers", "budget-brewers",
            "Powerful decks that respect your wallet. Proxies welcome, net-decks optional.",
            "DECK_DISCUSSION", CHANDRA, List.of("budget", "brew", "jank"), days(25));

        Post p1 = post(forum, KAYA, "$50 Mono-Black aristocrats — is it viable at LGS level?",
            "Sacrifice outlets, Blood Artist effects and a swarm of tokens. Can this hang against "
                + "upgraded precons without breaking the bank?", hours(30));
        Comment c1 = comment(p1, null, LILIANA,
            "Absolutely. Bastion of Remembrance and Bloodletter of Aclazotz do a lot of heavy lifting "
                + "for pennies.", hours(28));
        comment(p1, c1, KAYA, "Bloodletter is such a house. Adding it tonight.", hours(20));
        comment(p1, null, CHANDRA, "Village Rites + Deadly Dispute is the cheapest card advantage in "
            + "the format. Run both.", hours(12));
        votes(VoteTargetType.POST, p1, List.of(LILIANA, CHANDRA, JHOIRA, RAL), List.of());
        votes(VoteTargetType.COMMENT, c1, List.of(KAYA, CHANDRA), List.of());

        votes(VoteTargetType.FORUM, forum, List.of(KAYA, LILIANA, CHANDRA, JHOIRA), List.of(RAL));
        finalizeForum(forum);
    }

    // ── Forum 4: Lore & flavour ──────────────────────────────────────────────

    private void seedLoreForum() {
        Thread forum = forum("Planeswalker Lore", "planeswalker-lore",
            "The story of the Multiverse — from the Brothers' War to the latest set.",
            "LORE", LILIANA, List.of("lore", "story", "flavor"), days(15));

        Post p1 = post(forum, JHOIRA, "Ranking the planes by how much I'd actually want to live there",
            "Hot take: Kaladesh over Ravnica. Give me the Inventors' Fair and clean air over guild "
                + "politics any day. Where does your ideal home plane land?", hours(50));
        Comment c1 = comment(p1, null, RAL, "Ravnica slander will not be tolerated on this forum.",
            hours(48));
        comment(p1, c1, JHOIRA, "The trains are always late and there are ten HOAs. I stand by it.",
            hours(40));
        comment(p1, null, NISSA, "Zendikar. Dangerous, yes, but have you *seen* the Hedrons?", hours(20));
        votes(VoteTargetType.POST, p1, List.of(RAL, NISSA, TEFERI, GIDEON, KAYA), List.of(CHANDRA));
        votes(VoteTargetType.COMMENT, c1, List.of(TEFERI, KAYA, CHANDRA), List.of());

        votes(VoteTargetType.FORUM, forum, List.of(RAL, NISSA, TEFERI), List.of(JHOIRA, CHANDRA));
        finalizeForum(forum);
    }

    // ── Builders ─────────────────────────────────────────────────────────────

    private Thread forum(String title, String slug, String description, String category,
                         DemoUser author, List<String> tags, Instant createdAt) {
        Thread t = new Thread();
        t.setTitle(title);
        t.setSlug(slug);
        t.setDescription(description);
        t.setCategory(category);
        t.setLanguage("en");
        t.setTags(new java.util.ArrayList<>(tags));
        t.setAuthorId(author.id());
        t.setAuthorName(author.name());
        t.setMemberCount(EVERYONE.size());
        t.setSettings(ForumSettings.defaults());
        t.setCreatedAt(createdAt);
        t.setLastActivityAt(createdAt);
        return threadRepository.save(t);
    }

    private Post post(Thread forum, DemoUser author, String title, String body, Instant createdAt) {
        Post p = new Post();
        p.setThreadId(forum.getId());
        p.setAuthorId(author.id());
        p.setAuthorName(author.name());
        p.setAuthorAvatar(author.avatar());
        p.setTitle(title);
        p.setBody(body);
        p.setCreatedAt(createdAt);
        return postRepository.save(p);
    }

    private Comment comment(Post post, Comment parent, DemoUser author, String body, Instant createdAt) {
        Comment c = new Comment();
        c.setPostId(post.getId());
        c.setParentCommentId(parent == null ? null : parent.getId());
        c.setAuthorId(author.id());
        c.setAuthorName(author.name());
        c.setBody(body);
        c.setCreatedAt(createdAt);
        Comment saved = commentRepository.save(c);
        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);
        return saved;
    }

    /** Records votes and refreshes the target's denormalised tallies to match. */
    private void votes(VoteTargetType type, Object target, List<DemoUser> ups, List<DemoUser> downs) {
        String targetId = targetId(type, target);
        for (DemoUser u : ups) {
            saveVote(type, targetId, u, 1);
        }
        for (DemoUser u : downs) {
            saveVote(type, targetId, u, -1);
        }
        switch (type) {
            case POST -> {
                Post p = (Post) target;
                p.setUpvotes(ups.size());
                p.setDownvotes(downs.size());
                postRepository.save(p);
            }
            case COMMENT -> {
                Comment c = (Comment) target;
                c.setUpvotes(ups.size());
                c.setDownvotes(downs.size());
                commentRepository.save(c);
            }
            case FORUM -> {
                // Tallies are kept in memory; finalizeForum() persists them with the rest of the roll-up.
                Thread t = (Thread) target;
                t.setUpvotes(ups.size());
                t.setDownvotes(downs.size());
            }
        }
    }

    private static String targetId(VoteTargetType type, Object target) {
        return switch (type) {
            case POST -> ((Post) target).getId();
            case COMMENT -> ((Comment) target).getId();
            case FORUM -> ((Thread) target).getId();
        };
    }

    private void saveVote(VoteTargetType type, String targetId, DemoUser user, int value) {
        Vote v = new Vote();
        v.setTargetType(type);
        v.setTargetId(targetId);
        v.setUserId(user.id());
        v.setValue(value);
        v.setCreatedAt(now);
        voteRepository.save(v);
    }

    /** Rolls up the forum's post/reply counts, activity score and last-activity time. */
    private void finalizeForum(Thread forum) {
        List<Post> posts = postRepository.findByThreadIdOrderByCreatedAtDesc(
            forum.getId(), org.springframework.data.domain.Pageable.unpaged());
        long replies = posts.stream().mapToLong(Post::getCommentCount).sum();
        Instant lastActivity = posts.stream()
            .map(Post::getCreatedAt)
            .max(Instant::compareTo)
            .orElse(forum.getCreatedAt());
        forum.setPostCount(posts.size());
        forum.setReplyCount(replies);
        // A simple stand-in for the scheduled activity score so the rails aren't all zeroes.
        forum.setWeeklyActivityScore(posts.size() * 10L + replies * 3L);
        forum.setLastActivityAt(lastActivity);
        threadRepository.save(forum);
    }

    private Instant hours(long h) {
        return now.minus(Duration.ofHours(h));
    }

    private Instant days(long d) {
        return now.minus(Duration.ofDays(d));
    }
}
