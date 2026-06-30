import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Col, Container, Row, Spinner, Stack } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  fetchCardById,
  fetchEdhrecCommanderCategoriesClient,
  fetchRecommander,
} from '../services/scryfallApi';
import { type Card as CardType } from '../types/cardType';
import { CardGrid } from '../components/CardGrid';
import { PaginatedCardGrid } from '../components/PaginatedCardGrid';
import { FlipCard } from '../components/FlipCard';
import { ManaCost } from '../components/ManaCost';

const PRIMARY_TYPES = ['Creature', 'Planeswalker', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Battle', 'Land'];
const GROUP_ORDER = [...PRIMARY_TYPES, 'Other'];
const MAX_PER_GROUP = 30;

const TYPE_ICON: Record<string, string> = {
  top: '⭐',
  Creature: '🐾',
  Instant: '⚡',
  Sorcery: '🌀',
  Artifact: '⚙️',
  Enchantment: '✨',
  Planeswalker: '🧙',
  Battle: '⚔️',
  Land: '⛰️',
  Other: '🎴'
};

const primaryTypeOf = (typeLine?: string): string => {
  const tl = (typeLine ?? '').toLowerCase();
  if (tl.includes('land')) return 'Land';
  for (const type of PRIMARY_TYPES) {
    if (tl.includes(type.toLowerCase())) return type;
  }
  return 'Other';
};

export const CardDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [recFilter, setRecFilter] = useState<string>('top');

  const { data: card, isLoading } = useQuery<CardType | null>({
    queryKey: ['card', id],
    queryFn: () => fetchCardById(id || ''),
    enabled: Boolean(id)
  });

  const isCommander = useMemo(() => {
    const tl = (card?.type_line ?? '').toLowerCase();
    return tl.includes('legendary') && (tl.includes('creature') || tl.includes('planeswalker'));
  }, [card?.type_line]);

  const { data: recommander = [], isLoading: recommanderLoading } = useQuery<CardType[]>({
    queryKey: ['recommander', card?.name],
    queryFn: () => fetchRecommander(card?.name || '', 200),
    enabled: Boolean(card?.name) && isCommander,
    staleTime: 1000 * 60 * 30
  });

  // Recommander returns a flat ranked list; group it into per-type "apartados" (≤30 each),
  // mirroring how recommander.cards presents recommendations.
  const recommanderGroups = useMemo(() => {
    const groups = new Map<string, CardType[]>();
    for (const c of recommander) {
      const type = primaryTypeOf(c.type_line);
      const arr = groups.get(type) ?? [];
      if (arr.length < MAX_PER_GROUP) {
        arr.push(c);
        groups.set(type, arr);
      }
    }
    return GROUP_ORDER
      .filter((type) => groups.has(type))
      .map((type) => ({ type, cards: groups.get(type) as CardType[] }));
  }, [recommander]);

  // "Top picks" = the highest-scored across all types (recommander returns score-ordered).
  const recTopCards = useMemo(() => recommander.slice(0, MAX_PER_GROUP), [recommander]);

  const displayedRec = useMemo(
    () => (recFilter === 'top'
      ? recTopCards
      : recommanderGroups.find((g) => g.type === recFilter)?.cards ?? []),
    [recFilter, recTopCards, recommanderGroups]
  );

  const edhrecSlug = useMemo(() => {
    const slugify = (value: string) =>
      value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    const edhrecUrl = card?.related_uris?.edhrec;
    if (edhrecUrl) {
      try {
        const url = new URL(edhrecUrl);
        const parts = url.pathname.split('/').filter(Boolean);
        const commanderIndex = parts.indexOf('commanders');
        if (commanderIndex !== -1 && parts[commanderIndex + 1]) {
          return parts[commanderIndex + 1];
        }
      } catch {
        // ignore
      }
    }

    if (card?.name) {
      return slugify(card.name);
    }

    return null;
  }, [card?.name, card?.related_uris?.edhrec]);

  const {
    data: edhrecCategories = [],
    isLoading: edhrecLoading
  } = useQuery({
    queryKey: ['edhrec-categories', edhrecSlug],
    queryFn: () => fetchEdhrecCommanderCategoriesClient(edhrecSlug || ''),
    enabled: Boolean(edhrecSlug)
  });

  const categoriesWithIds = useMemo(() => {
    const toId = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const iconForCategory = (tag: string, header: string) => {
      const key = `${tag} ${header}`.toLowerCase();
      if (key.includes('new')) return '🆕';
      if (key.includes('synergy')) return '✨';
      if (key.includes('top')) return '⭐';
      if (key.includes('game')) return '⚡';
      if (key.includes('creature')) return '🐾';
      if (key.includes('instant')) return '⚡';
      if (key.includes('sorcer')) return '🧪';
      if (key.includes('artifact')) return '⚙️';
      if (key.includes('enchant')) return '🪄';
      if (key.includes('battle')) return '⚔️';
      if (key.includes('planes')) return '🧙';
      if (key.includes('land')) return '⛰️';
      return '•';
    };

    return edhrecCategories.map(category => {
      const raw = category.tag || category.header || 'category';
      return {
        ...category,
        anchorId: `edhrec-${toId(raw)}`,
        icon: iconForCategory(category.tag, category.header)
      };
    });
  }, [edhrecCategories]);

  useEffect(() => {
    if (categoriesWithIds.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top > b.boundingClientRect.top ? 1 : -1));

        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('id');
          if (id) {
            setActiveCategoryId(id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: [0, 0.1, 0.5, 1] }
    );

    categoriesWithIds.forEach(category => {
      const section = document.getElementById(category.anchorId);
      if (section) {
        observer.observe(section);
      }
    });

    return () => observer.disconnect();
  }, [categoriesWithIds]);

  if (isLoading) {
    return (
      <Container className="page-container text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!card) {
    return (
      <Container className="page-container text-center">
        <p className="text-muted">{t('card.notFound')}</p>
      </Container>
    );
  }

  const colorIdentityCost = card.color_identity?.length
    ? card.color_identity.map(color => `{${color}}`).join('')
    : '';

  return (
    <Container className="page-container">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Row className="g-4">
          <Col md={5}>
            <Card className="detail-card">
              <FlipCard card={card} />
            </Card>
          </Col>
          <Col md={7}>
            <Stack gap={3}>
              <div>
                <h1 className="detail-title">{card.name}</h1>
                <p className="detail-subtitle">{card.type_line}</p>
                <div className="detail-mana">
                  <ManaCost manaCost={card.mana_cost} />
                </div>
              </div>

              <div className="detail-box">
                <h5>{t('card.details')}</h5>
                {card.card_faces?.length ? (
                  <Stack gap={3}>
                    {card.card_faces.map((face, i) => (
                      <div key={`${face.name}-${i}`}>
                        <div className="d-flex align-items-baseline justify-content-between flex-wrap">
                          <strong>{face.name}</strong>
                          {face.mana_cost && <ManaCost manaCost={face.mana_cost} size={16} />}
                        </div>
                        {face.type_line && <div className="text-muted small mb-1">{face.type_line}</div>}
                        <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>{face.oracle_text}</p>
                      </div>
                    ))}
                  </Stack>
                ) : (
                  <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>{card.oracle_text}</p>
                )}
              </div>

              <div className="detail-meta">
                <div>
                  <div className="text-muted small">{t('card.cmc')}</div>
                  <div>{card.cmc}</div>
                </div>
                {card.set_name && (
                  <div>
                    <div className="text-muted small">{t('card.set')}</div>
                    <div>{card.set_name}</div>
                  </div>
                )}
                {card.rarity && (
                  <div>
                    <div className="text-muted small">{t('card.rarity')}</div>
                    <div>{card.rarity}</div>
                  </div>
                )}
                {card.artist && (
                  <div>
                    <div className="text-muted small">{t('card.artist')}</div>
                    <div>{card.artist}</div>
                  </div>
                )}
                {colorIdentityCost && (
                  <div>
                    <div className="text-muted small">{t('card.colorIdentity')}</div>
                    <ManaCost manaCost={colorIdentityCost} size={18} />
                  </div>
                )}
              </div>

              <Stack direction="horizontal" gap={3} className="flex-wrap">
                {card.released_at && (
                  <div>
                    <div className="text-muted small">{t('card.release')}</div>
                    <div>{card.released_at}</div>
                  </div>
                )}
                <div>
                  <div className="text-muted small">{t('card.price')}</div>
                  <div className="d-flex flex-column">
                    <span>TCGplayer: {card.prices?.usd ? `$${card.prices.usd}` : '-.-'}</span>
                    <span>Cardmarket: {card.prices?.eur ? `€${card.prices.eur}` : '-.-'}</span>
                  </div>
                </div>
              </Stack>

              {card.related_uris?.edhrec && (
                <Button
                  variant="outline-primary"
                  href={card.related_uris.edhrec}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on EDHREC ↗
                </Button>
              )}
            </Stack>
          </Col>
        </Row>
      </motion.div>

      {isCommander && (
        <section className="mt-5">
          <h2 className="section-title">{t('card.recommander', 'Recomendaciones')}</h2>
          <p className="text-muted text-center small">
            {t('card.recommanderSource', 'Sugerencias basadas en mazos reales · recommander.cards')}
          </p>
          {recommanderLoading ? (
            <div className="text-center my-4">
              <Spinner animation="border" />
            </div>
          ) : recommanderGroups.length === 0 ? (
            <p className="text-muted text-center">
              {t('card.recommanderEmpty', 'Sin recomendaciones disponibles ahora mismo.')}
            </p>
          ) : (
            <>
              <div className="type-filter" role="tablist" aria-label={t('card.filterByType', 'Filtrar por tipo')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={recFilter === 'top'}
                  className={`type-chip${recFilter === 'top' ? ' is-active' : ''}`}
                  onClick={() => setRecFilter('top')}
                  title={t('card.topPicks', 'Top')}
                >
                  <span className="type-chip__ico" aria-hidden="true">{TYPE_ICON.top}</span>
                  <span className="type-chip__label">{t('card.topPicks', 'Top')}</span>
                  <span className="chip-count">{recTopCards.length}</span>
                </button>
                {recommanderGroups.map((group) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={recFilter === group.type}
                    key={group.type}
                    className={`type-chip${recFilter === group.type ? ' is-active' : ''}`}
                    onClick={() => setRecFilter(group.type)}
                    title={group.type}
                  >
                    <span className="type-chip__ico" aria-hidden="true">{TYPE_ICON[group.type] ?? '•'}</span>
                    <span className="type-chip__label">{group.type}</span>
                    <span className="chip-count">{group.cards.length}</span>
                  </button>
                ))}
              </div>
              <PaginatedCardGrid key={recFilter} cards={displayedRec} pageSize={12} />
            </>
          )}
        </section>
      )}

      {edhrecSlug && (
        <section className="mt-5">
          <h2 className="section-title">{t('card.edhrecCategories')}</h2>
          {edhrecLoading && (
            <div className="text-center my-4">
              <Spinner animation="border" />
            </div>
          )}
          {!edhrecLoading && edhrecCategories.length === 0 && (
            <p className="text-muted">{t('card.edhrecEmpty')}</p>
          )}
          <Row className="g-4 edhrec-layout">
            <Col md={3} className="edhrec-nav">
              <div className="edhrec-nav-title">{t('card.edhrecCategories')}</div>
              <Stack gap={2}>
                {categoriesWithIds.map(category => (
                  <a
                    key={`nav-${category.tag}-${category.header}`}
                    className={`edhrec-nav-link${activeCategoryId === category.anchorId ? ' active' : ''}`}
                    href={`#${category.anchorId}`}
                  >
                    <span className="edhrec-nav-icon" aria-hidden="true">
                      {category.icon}
                    </span>
                    <span>{category.header}</span>
                    <span className="edhrec-nav-count">{category.cards.length}</span>
                  </a>
                ))}
              </Stack>
            </Col>
            <Col md={9}>
              <Stack gap={4}>
                {categoriesWithIds.map(category => (
                  <div
                    key={`${category.tag}-${category.header}`}
                    id={category.anchorId}
                    className="edhrec-section"
                  >
                    <div className="d-flex align-items-baseline justify-content-between flex-wrap mb-2">
                      <h3 className="category-title">{category.header}</h3>
                      {category.tag && <span className="text-muted small">{category.tag}</span>}
                    </div>
                    <CardGrid
                      cards={category.cards}
                      loading={false}
                      emptyMessage={t('search.empty')}
                    />
                  </div>
                ))}
              </Stack>
            </Col>
          </Row>
        </section>
      )}
    </Container>
  );
};
