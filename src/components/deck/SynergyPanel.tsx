import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Nav, Spinner, Stack } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addCardToDraft, changeQty, fetchCardById, fetchSuggestions, removeCardFromDraft,
} from '../../features/deck/deckSlice';
import { CardTile } from './CardTile';
import {
  fetchEdhrecCommanderCategoriesClient,
  fetchRecommanderCategories,
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

type SourceId = 'recommander' | 'edhrec' | 'ai';

/** Cards shown at once inside a source's selected group. */
const CARDS_PER_GROUP = 12;
/** How many cards to pull per recommander apartado — the panel is a sidebar, not a full page. */
const RECOMMANDER_PER_CATEGORY = 24;
/**
 * How long to wait after the last decklist edit before asking the recommender again. Every edit
 * changes the answer, so without this a burst of card additions would be a burst of upstream
 * calls against a rate-limited public API.
 */
const DECK_DEBOUNCE_MS = 2000;
const CACHE_MS = 1000 * 60 * 30;

/** Categories that are not part of the deck the recommender should be reasoning about. */
const EXCLUDED_CATEGORIES = new Set(['Sideboard', 'Maybeboard']);

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

/** Settles on a value only once it has stopped changing for `delayMs`. */
const useDebounced = <T,>(value: T, delayMs: number): T => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
};

export const SynergyPanel = ({ deckId }: { deckId: string | null }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { current, suggestions, draft } = useAppSelector((s) => s.deck);
  const synergies = current?.stats.synergies ?? [];
  const [source, setSource] = useState<SourceId>('recommander');

  const qtyById = useMemo(() => {
    const map = new Map<string, number>();
    draft.cards.forEach((c) => map.set(c.scryfallId, c.qty));
    return map;
  }, [draft.cards]);

  const isCommander = Boolean(draft.format === 'commander' && draft.commanderName);

  // Sorted and newline-joined so the value is a stable query key: the same 99 cards in a
  // different order must not look like a different deck.
  const deckSignature = useMemo(() => {
    if (!isCommander) return '';
    return draft.cards
      .filter((c) => !EXCLUDED_CATEGORIES.has(c.category ?? '') && c.name !== draft.commanderName)
      .map((c) => c.name)
      .sort()
      .join('\n');
  }, [draft.cards, draft.commanderName, isCommander]);

  const settledDeck = useDebounced(deckSignature, DECK_DEBOUNCE_MS);

  const { data: recommander = [], isFetching: recommanderLoading } = useQuery({
    queryKey: ['recommander-categories', draft.commanderName, settledDeck],
    queryFn: () => fetchRecommanderCategories(
      draft.commanderName,
      RECOMMANDER_PER_CATEGORY,
      settledDeck ? settledDeck.split('\n') : [],
    ),
    enabled: isCommander,
    staleTime: CACHE_MS,
  });

  const { data: edhrec = [], isFetching: edhrecLoading } = useQuery({
    queryKey: ['edhrec-categories', draft.commanderName],
    queryFn: () => fetchEdhrecCommanderCategoriesClient(slugify(draft.commanderName)),
    enabled: isCommander,
    staleTime: CACHE_MS,
  });

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

  const noCommander = t('builder.noSuggestionsCommander', 'Pick a commander to get recommendations.');
  const tunedToDeck = settledDeck.length > 0;

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

      <Nav
        variant="tabs"
        className="suggestion-tabs"
        activeKey={source}
        onSelect={(key) => setSource((key as SourceId) ?? 'recommander')}
      >
        <Nav.Item>
          <Nav.Link eventKey="recommander">{t('builder.recommanderTitle', 'Recommander')}</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="edhrec">{t('builder.edhrecTitle', 'EDHREC')}</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="ai">{t('builder.aiSuggestions', 'AI suggestions')}</Nav.Link>
        </Nav.Item>
      </Nav>

      <div className="suggestion-panel">
        {source === 'recommander' && (
          <RecommendationSection
            subtitle={tunedToDeck
              ? t('builder.recommanderTuned', 'Tuned to your decklist · recommander.cards')
              : t('builder.recommanderSource', 'Based on real decklists · recommander.cards')}
            groups={recommanderGroups}
            loading={recommanderLoading}
            emptyMessage={isCommander
              ? t('builder.recommanderEmpty', 'No recommander suggestions for this commander.')
              : noCommander}
            actions={cardActions}
          />
        )}

        {source === 'edhrec' && (
          <RecommendationSection
            subtitle={t('builder.edhrecSource', 'Most-played cards by category · edhrec.com')}
            groups={edhrecGroups}
            loading={edhrecLoading}
            emptyMessage={isCommander
              ? t('builder.edhrecEmpty', 'No EDHREC categories for this commander.')
              : noCommander}
            actions={cardActions}
          />
        )}

        {source === 'ai' && (
          <>
            <div className="d-flex justify-content-between align-items-center gap-2">
              <span className="text-muted small">
                {t('builder.aiSource', 'Computed from your current decklist')}
              </span>
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
          </>
        )}
      </div>
    </div>
  );
};

interface SectionProps {
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
 * One recommendation source: a chip row of that source's own categories and the cards of the
 * selected one. Keeping EDHREC and recommander.cards on separate tabs makes clear which engine
 * suggested what, and stops one source's categories being mistaken for the other's.
 */
function RecommendationSection({ subtitle, groups, loading, emptyMessage, actions }: SectionProps) {
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
    <div>
      <span className="text-muted small">{subtitle}</span>

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
          <div className="type-filter mt-2" role="tablist" aria-label={subtitle}>
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
