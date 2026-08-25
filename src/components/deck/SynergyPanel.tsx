import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Spinner, Stack } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addCardToDraft, changeQty, fetchCardById, fetchSuggestions, removeCardFromDraft,
} from '../../features/deck/deckSlice';
import { CardTile } from './CardTile';
import {
  fetchEdhrecCommanderCategoriesClient,
  fetchRecommanderCategories,
  type EdhrecCategory,
  type RecommanderCategory,
} from '../../services/scryfallApi';
import { recommanderCategoryIcon, recommanderCategoryLabel } from '../../utils/recommanderCategories';
import type { Card } from '../../types/cardType';

/** A recommendation group rendered as a chip + its cards, whatever the source. */
interface Group {
  id: string;
  label: string;
  icon: string;
  cards: Card[];
}

/** Cards shown at once inside a source's selected group. */
const CARDS_PER_GROUP = 12;
/** How many cards to pull per recommander apartado — the panel is a sidebar, not a full page. */
const RECOMMANDER_PER_CATEGORY = 24;

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const edhrecIcon = (tag: string, header: string): string => {
  const key = `${tag} ${header}`.toLowerCase();
  if (key.includes('new')) return '🆕';
  if (key.includes('high synergy') || key.includes('synergy')) return '✨';
  if (key.includes('top')) return '⭐';
  if (key.includes('creature')) return '🐾';
  if (key.includes('instant')) return '⚡';
  if (key.includes('sorcer')) return '🌀';
  if (key.includes('artifact')) return '⚙️';
  if (key.includes('enchant')) return '🪄';
  if (key.includes('battle')) return '⚔️';
  if (key.includes('planes')) return '🧙';
  if (key.includes('utility land')) return '🗺️';
  if (key.includes('land')) return '⛰️';
  return '•';
};

export const SynergyPanel = ({ deckId }: { deckId: string | null }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { current, suggestions, draft } = useAppSelector((s) => s.deck);
  const synergies = current?.stats.synergies ?? [];
  const qtyById = useMemo(() => {
    const map = new Map<string, number>();
    draft.cards.forEach((c) => map.set(c.scryfallId, c.qty));
    return map;
  }, [draft.cards]);

  const [edhrec, setEdhrec] = useState<EdhrecCategory[]>([]);
  const [edhrecLoading, setEdhrecLoading] = useState(false);
  const [recommander, setRecommander] = useState<RecommanderCategory[]>([]);
  const [recommanderLoading, setRecommanderLoading] = useState(false);

  const isCommander = draft.format === 'commander' && draft.commanderName;

  useEffect(() => {
    if (!isCommander) {
      setEdhrec([]);
      return;
    }
    setEdhrecLoading(true);
    fetchEdhrecCommanderCategoriesClient(slugify(draft.commanderName))
      .then(setEdhrec)
      .finally(() => setEdhrecLoading(false));
  }, [draft.commanderName, draft.format, isCommander]);

  useEffect(() => {
    if (!isCommander) {
      setRecommander([]);
      return;
    }
    setRecommanderLoading(true);
    fetchRecommanderCategories(draft.commanderName, RECOMMANDER_PER_CATEGORY)
      .then(setRecommander)
      .finally(() => setRecommanderLoading(false));
  }, [draft.commanderName, draft.format, isCommander]);

  const addById = (scryfallId: string) => {
    dispatch(fetchCardById(scryfallId))
      .unwrap()
      .then((card) => dispatch(addCardToDraft(card)))
      .catch(() => undefined);
  };

  const recommanderGroups: Group[] = useMemo(
    () => recommander.map((c) => ({
      id: c.id,
      label: recommanderCategoryLabel(t, c),
      icon: recommanderCategoryIcon(c.id),
      cards: c.cards,
    })),
    [recommander, t],
  );

  const edhrecGroups: Group[] = useMemo(
    () => edhrec
      .filter((c) => c.cards.length > 0)
      .map((c, index) => ({
        id: `${c.tag || 'cat'}-${index}`,
        label: c.header,
        icon: edhrecIcon(c.tag, c.header),
        cards: c.cards,
      })),
    [edhrec],
  );

  const cardActions = {
    qtyOf: (id: string) => qtyById.get(id) ?? 0,
    onAdd: addById,
    onInc: (id: string) => dispatch(changeQty({ scryfallId: id, delta: 1 })),
    onDec: (id: string) => dispatch(changeQty({ scryfallId: id, delta: -1 })),
    onRemove: (id: string) => dispatch(removeCardFromDraft(id)),
  };

  return (
    <div>
      {synergies.length > 0 ? (
        <Stack direction="horizontal" gap={2} className="flex-wrap mb-3">
          {synergies.map((syn) => (
            <Badge bg="info" key={syn.keyword}>
              {syn.keyword} ×{syn.cardCount}
            </Badge>
          ))}
        </Stack>
      ) : (
        <p className="text-muted small">{t('builder.synergyHint', 'Save the deck to compute synergies from card text.')}</p>
      )}

      <RecommendationSection
        title={t('builder.recommanderTitle', 'Recommander')}
        subtitle={t('builder.recommanderSource', 'Based on real decklists · recommander.cards')}
        groups={recommanderGroups}
        loading={recommanderLoading}
        emptyMessage={isCommander
          ? t('builder.recommanderEmpty', 'No recommander suggestions for this commander.')
          : t('builder.noSuggestionsCommander', 'Pick a commander to get recommendations.')}
        actions={cardActions}
      />

      <RecommendationSection
        title={t('builder.edhrecTitle', 'EDHREC')}
        subtitle={t('builder.edhrecSource', 'Most-played cards by category · edhrec.com')}
        groups={edhrecGroups}
        loading={edhrecLoading}
        emptyMessage={isCommander
          ? t('builder.edhrecEmpty', 'No EDHREC categories for this commander.')
          : t('builder.noSuggestionsCommander', 'Pick a commander to get recommendations.')}
        actions={cardActions}
      />

      <div className="recommendation-section">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-0">{t('builder.aiSuggestions', 'AI suggestions')}</h6>
            <span className="text-muted small">
              {t('builder.aiSource', 'Computed from your current decklist')}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline-primary"
            disabled={!deckId}
            onClick={() => deckId && dispatch(fetchSuggestions(deckId))}
          >
            {t('builder.getSuggestions', 'Get suggestions')}
          </Button>
        </div>
        {suggestions.length > 0 ? (
          <div className="card-grid-4 mt-2">
            {suggestions.map((suggestion) => (
              <CardTile
                key={`ai-${suggestion.scryfallId}`}
                scryfallId={suggestion.scryfallId}
                name={suggestion.name}
                imageUrl={suggestion.imageUrl}
                qty={cardActions.qtyOf(suggestion.scryfallId)}
                caption={suggestion.reason}
                addLabel={t('builder.addToDeck', '+ Add')}
                onAdd={() => cardActions.onAdd(suggestion.scryfallId)}
                onInc={() => cardActions.onInc(suggestion.scryfallId)}
                onDec={() => cardActions.onDec(suggestion.scryfallId)}
                onRemove={() => cardActions.onRemove(suggestion.scryfallId)}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted small mt-2 mb-0">{t('builder.noSuggestions', 'No suggestions yet.')}</p>
        )}
      </div>
    </div>
  );
};

interface SectionProps {
  title: string;
  subtitle: string;
  groups: Group[];
  loading: boolean;
  emptyMessage: string;
  actions: {
    qtyOf: (id: string) => number;
    onAdd: (id: string) => void;
    onInc: (id: string) => void;
    onDec: (id: string) => void;
    onRemove: (id: string) => void;
  };
}

/**
 * One recommendation source rendered as its own "apartado": a header, a chip row of the
 * source's own categories, and the cards of the selected category. Keeping EDHREC and
 * recommander.cards in separate sections makes clear which engine suggested what.
 */
function RecommendationSection({ title, subtitle, groups, loading, emptyMessage, actions }: SectionProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  // Which category is expanded, rather than a boolean: switching category then collapses on its
  // own, with no effect needed to reset it.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // The category set changes with the commander; fall back to the first one when it does.
  const active = groups.find((g) => g.id === activeId) ?? groups[0] ?? null;
  const showAll = active !== null && expandedId === active.id;

  const visible = showAll ? active?.cards ?? [] : (active?.cards ?? []).slice(0, CARDS_PER_GROUP);

  return (
    <div className="recommendation-section">
      <div>
        <h6 className="mb-0">{title}</h6>
        <span className="text-muted small">{subtitle}</span>
      </div>

      {loading && (
        <div className="text-center my-3">
          <Spinner animation="border" size="sm" />
        </div>
      )}

      {!loading && groups.length === 0 && (
        <p className="text-muted small mt-2 mb-0">{emptyMessage}</p>
      )}

      {!loading && active && (
        <>
          <div className="type-filter mt-2" role="tablist" aria-label={title}>
            {groups.map((group) => (
              <button
                type="button"
                role="tab"
                key={group.id}
                aria-selected={group.id === active.id}
                className={`type-chip${group.id === active.id ? ' is-active' : ''}`}
                onClick={() => setActiveId(group.id)}
                title={group.label}
              >
                <span className="type-chip__ico" aria-hidden="true">{group.icon}</span>
                <span className="type-chip__label">{group.label}</span>
                <span className="chip-count">{group.cards.length}</span>
              </button>
            ))}
          </div>

          <div className="card-grid-4 mt-2">
            {visible.map((card) => (
              <CardTile
                key={`${active.id}-${card.id}`}
                scryfallId={card.id}
                name={card.name}
                imageUrl={card.image_uris?.normal ?? card.image_uris?.small ?? null}
                qty={actions.qtyOf(card.id)}
                caption={active.label}
                addLabel={t('builder.addToDeck', '+ Add')}
                onAdd={() => actions.onAdd(card.id)}
                onInc={() => actions.onInc(card.id)}
                onDec={() => actions.onDec(card.id)}
                onRemove={() => actions.onRemove(card.id)}
              />
            ))}
          </div>

          {active.cards.length > CARDS_PER_GROUP && (
            <Button
              size="sm"
              variant="link"
              className="p-0 mt-1"
              onClick={() => setExpandedId(showAll ? null : active.id)}
            >
              {showAll
                ? t('builder.showLess', 'Show less')
                : t('builder.showAllCount', 'Show all {{count}}', { count: active.cards.length })}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
