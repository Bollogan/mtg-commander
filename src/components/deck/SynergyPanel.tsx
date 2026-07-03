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
  fetchRecommander,
  type EdhrecCategory,
} from '../../services/scryfallApi';
import type { Card } from '../../types/cardType';

type RecommendationSource = 'edhrec' | 'recommander' | 'ai';

interface Recommendation {
  scryfallId: string;
  name: string;
  imageUrl: string | null;
  reason: string;
  source: RecommendationSource;
}

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');

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
  const [recommander, setRecommander] = useState<Card[]>([]);
  const [recommanderLoading, setRecommanderLoading] = useState(false);

  const isCommander = draft.format === 'commander' && draft.commanderName;

  useEffect(() => {
    if (!isCommander) {
      setEdhrec([]);
      setRecommander([]);
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
    fetchRecommander(draft.commanderName, 12)
      .then(setRecommander)
      .finally(() => setRecommanderLoading(false));
  }, [draft.commanderName, draft.format, isCommander]);

  const addById = (scryfallId: string) => {
    dispatch(fetchCardById(scryfallId))
      .unwrap()
      .then((card) => dispatch(addCardToDraft(card)))
      .catch(() => undefined);
  };

  const aiRecommendations: Recommendation[] = suggestions.map((s) => ({
    scryfallId: s.scryfallId,
    name: s.name,
    imageUrl: s.imageUrl,
    reason: s.reason,
    source: 'ai',
  }));

  const recommanderRecommendations: Recommendation[] = recommander.map((c) => ({
    scryfallId: c.id,
    name: c.name,
    imageUrl: c.image_uris?.normal ?? c.image_uris?.small ?? null,
    reason: t('builder.recommanderReason', 'Popular with this commander'),
    source: 'recommander',
  }));

  const edhrecRecommendations: Recommendation[] = edhrec
    .filter((cat) => cat.cards.length > 0)
    .flatMap((cat) =>
      cat.cards.slice(0, 5).map((c) => ({
        scryfallId: c.id,
        name: c.name,
        imageUrl: c.image_uris?.normal ?? c.image_uris?.small ?? null,
        reason: cat.header,
        source: 'edhrec' as RecommendationSource,
      })),
    );

  const allRecommendations = [
    ...edhrecRecommendations,
    ...recommanderRecommendations,
    ...aiRecommendations,
  ];

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

      <div className="d-flex justify-content-between align-items-center mt-2">
        <span className="text-muted small">{t('builder.suggestions', 'Suggestions')}</span>
        <Button
          size="sm"
          variant="outline-primary"
          disabled={!deckId}
          onClick={() => deckId && dispatch(fetchSuggestions(deckId))}
        >
          {t('builder.getSuggestions', 'Get suggestions')}
        </Button>
      </div>

      {(edhrecLoading || recommanderLoading) && (
        <div className="text-center my-3">
          <Spinner animation="border" size="sm" />
        </div>
      )}

      {allRecommendations.length > 0 ? (
        <div className="card-grid-4 mt-2">
          {allRecommendations.map((rec) => (
            <CardTile
              key={`${rec.source}-${rec.scryfallId}`}
              scryfallId={rec.scryfallId}
              name={rec.name}
              imageUrl={rec.imageUrl}
              qty={qtyById.get(rec.scryfallId) ?? 0}
              caption={`${rec.reason} · ${rec.source}`}
              addLabel={t('builder.addToDeck', '+ Add')}
              onAdd={() => addById(rec.scryfallId)}
              onInc={() => dispatch(changeQty({ scryfallId: rec.scryfallId, delta: 1 }))}
              onDec={() => dispatch(changeQty({ scryfallId: rec.scryfallId, delta: -1 }))}
              onRemove={() => dispatch(removeCardFromDraft(rec.scryfallId))}
            />
          ))}
        </div>
      ) : (
        !edhrecLoading && !recommanderLoading && (
          <p className="text-muted small mt-2">
            {isCommander
              ? t('builder.noSuggestionsCommander', 'No suggestions yet. Save the deck or add a commander.')
              : t('builder.noSuggestions', 'No suggestions yet.')}
          </p>
        )
      )}
    </div>
  );
};
