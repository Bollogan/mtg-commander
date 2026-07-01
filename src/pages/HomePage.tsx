import { lazy, Suspense, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { fetchTopCommanders, type TopCommander } from '../services/scryfallApi';

// three.js is ~286 KB gzip — only the landing needs it, so load it on demand.
const CardScene = lazy(() =>
  import('../components/landing/CardScene').then((m) => ({ default: m.CardScene })),
);

interface Feature {
  glyph: string;
  titleKey: string;
  bodyKey: string;
  to: string;
  ctaKey: string;
}

const FEATURES: Feature[] = [
  { glyph: '⌕', titleKey: 'landing.f1Title', bodyKey: 'landing.f1Body', to: '/search', ctaKey: 'landing.f1Cta' },
  { glyph: '♛', titleKey: 'landing.f2Title', bodyKey: 'landing.f2Body', to: '/commanders', ctaKey: 'landing.f2Cta' },
  { glyph: '⛭', titleKey: 'landing.f3Title', bodyKey: 'landing.f3Body', to: '/decks/build', ctaKey: 'landing.f3Cta' },
  { glyph: '⚔', titleKey: 'landing.f4Title', bodyKey: 'landing.f4Body', to: '/play', ctaKey: 'landing.f4Cta' },
];

export const HomePage = () => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  // A few real commanders power the 3D card textures behind the page (falls back to the
  // Scryfall image endpoint by id if a card has no image_uris).
  const { data: topCommanders = [] } = useQuery<TopCommander[]>({
    queryKey: ['topCommanders'],
    queryFn: () => fetchTopCommanders(8),
    staleTime: 1000 * 60 * 60,
  });
  const cardImages = topCommanders
    .map((tc) => tc.card.image_uris?.normal
      ?? (tc.card.id ? `https://api.scryfall.com/cards/${tc.card.id}?format=image&version=normal` : ''))
    .filter(Boolean)
    .slice(0, 5);

  // Parallax: the ambient glow + hero content drift at different rates as you scroll away.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const glowY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '40%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-18%']);
  const contentFade = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0]);

  return (
    <main className="landing">
      {/* Fixed 3D card layer behind the whole landing (non-interactive, loaded on demand). */}
      <Suspense fallback={null}>
        <CardScene images={cardImages} />
      </Suspense>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="landing-hero" ref={heroRef}>
        <motion.div className="landing-hero__glow" style={{ y: glowY }} aria-hidden="true" />
        <motion.div className="landing-hero__inner" style={{ y: contentY, opacity: contentFade }}>
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            ✦ {t('app.title')}
          </motion.span>
          <motion.h1
            className="landing-hero__title"
            initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.85, ease: [0.2, 0.8, 0.2, 1], delay: 0.05 }}
          >
            {t('landing.heroTitle')}
          </motion.h1>
          <motion.p
            className="landing-hero__lede"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
          >
            {t('landing.heroLede')}
          </motion.p>
          <motion.div
            className="landing-hero__cta"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Link to="/search" className="btn-hero btn-hero--primary">{t('landing.ctaExplore')}</Link>
            <Link to="/commanders" className="btn-hero btn-hero--ghost">{t('landing.ctaCommanders')}</Link>
          </motion.div>
        </motion.div>
        <div className="landing-hero__scroll" aria-hidden="true">
          <span>{t('landing.scroll')}</span>
          <span className="landing-hero__scroll-line" />
        </div>
      </section>

      {/* ── Feature panels (zig-zag, scroll-revealed) ────────────────────────── */}
      <div className="landing-features">
        {FEATURES.map((f, i) => (
          <section key={f.to} className={`feature-row reveal${i % 2 ? ' feature-row--reverse' : ''}`}>
            <div className="feature-media" aria-hidden="true">
              <span className="feature-media__glyph">{f.glyph}</span>
              <span className="feature-media__index tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="feature-copy">
              <h2 className="feature-copy__title">{t(f.titleKey)}</h2>
              <p className="feature-copy__body">{t(f.bodyKey)}</p>
              <Link to={f.to} className="feature-copy__link">{t(f.ctaKey)} <span aria-hidden="true">→</span></Link>
            </div>
          </section>
        ))}
      </div>

      {/* ── Closing call-to-action ───────────────────────────────────────────── */}
      <section className="landing-final reveal">
        <h2 className="landing-final__title">{t('landing.finalTitle')}</h2>
        <p className="landing-final__lede">{t('landing.finalLede')}</p>
        <div className="landing-hero__cta">
          <Link to="/register" className="btn-hero btn-hero--primary">{t('landing.ctaJoin')}</Link>
          <Link to="/decks/build" className="btn-hero btn-hero--ghost">{t('landing.ctaBuild')}</Link>
        </div>
      </section>
    </main>
  );
};
