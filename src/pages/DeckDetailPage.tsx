import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Container, Spinner, Stack } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCardByName, fetchDeck } from '../features/deck/deckSlice';
import { evaluateDraft, rulesFor } from '../data/formats';
import { cardMeta, toViewCard, type GroupBy, type ImageSize, type SortBy, type ViewMode } from '../components/deck/deckView';
import { DeckToolbar } from '../components/deck/DeckToolbar';
import { LegalityPanel } from '../components/deck/LegalityPanel';
import { StacksView, GridView, TextView, TableView } from '../components/deck/DeckViews';
import { apiClient } from '../api/client';
import type { FormatRules } from '../data/formats';
import type { ScryfallCard } from '../features/deck/deckSlice';

export const DeckDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { current, status, error } = useAppSelector((s) => s.deck);
  const currentUserId = useAppSelector((s) => s.auth.userId);

  const [view, setView] = useState<ViewMode>('stacks');
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [imageSize, setImageSize] = useState<ImageSize>('md');
  const [formats, setFormats] = useState<FormatRules[]>([]);
  const [commanderCard, setCommanderCard] = useState<ScryfallCard | null>(null);

  useEffect(() => {
    if (id) dispatch(fetchDeck(id));
  }, [dispatch, id]);

  useEffect(() => {
    apiClient.get<FormatRules[]>('/api/decks/formats')
      .then((r) => { if (Array.isArray(r.data) && r.data.length) setFormats(r.data); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!current || !rulesFor(current.format).requiresCommander || !current.commanderName) {
      setCommanderCard(null);
      return;
    }
    dispatch(fetchCardByName(current.commanderName))
      .unwrap()
      .then(setCommanderCard)
      .catch(() => setCommanderCard(null));
  }, [dispatch, current]);

  const deck = current;

  const commanderIdentity = useMemo(() => {
    if (!deck || !rulesFor(deck.format).requiresCommander || !deck.commanderName) return null;
    const commander = deck.cards.find(
      (c) => c.name.toLowerCase() === deck.commanderName!.toLowerCase(),
    );
    return commander?.colorIdentity ?? null;
  }, [deck]);

  const report = useMemo(() => {
    if (!deck) return null;
    return evaluateDraft(
      deck.format,
      deck.cards.map((c) => ({ qty: c.qty, name: c.name, meta: cardMeta(c) })),
      commanderIdentity,
    );
  }, [deck, commanderIdentity]);

  const flagged = useMemo(() => {
    if (!report) return new Set<string>();
    return new Set(report.violations.map((v) => v.cardName).filter((n): n is string => Boolean(n)));
  }, [report]);

  if (status === 'loading') {
    return (
      <Container className="page-container text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error || !deck) {
    return (
      <Container className="page-container">
        <Card className="deck-card">
          <Card.Body>
            <Card.Title>{t('deckDetail.notFound', 'Deck not found')}</Card.Title>
            <p className="text-muted">{error ?? t('deckDetail.notFoundMessage', 'This deck does not exist or is private.')}</p>
            <Button onClick={() => navigate('/decks')}>{t('deckDetail.back', 'Back to decks')}</Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  const viewProps = {
    cards: deck.cards,
    groupBy,
    sortBy,
    imageSize,
    flagged,
    categories: deck.categories,
    readonly: true,
    commanderCard: commanderCard ? toViewCard(commanderCard) : null,
    priceSource: 'usd' as const,
    priceFoil: false,
  };

  return (
    <Container className="page-container">
      <Card className="deck-card mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h1 className="h3">{deck.name}</h1>
              <p className="text-muted mb-1">
                {t(`builder.vis_${deck.visibility}`)} · {formats.find((f) => f.format === deck.format)?.label ?? deck.format}
                {deck.commanderName && ` · ${t('builder.commander')}: ${deck.commanderName}`}
              </p>
              <p className="text-muted small mb-0">
                {t('deckDetail.by', 'by')} {deck.ownerName} · {deck.stats.totalCards} {t('builder.cards')}
              </p>
              {deck.description && <p className="mt-2">{deck.description}</p>}
            </div>
            <Stack direction="horizontal" gap={2}>
              <Button variant="outline-info" onClick={() => navigate(`/play?deckId=${deck.id}`)}>
                {t('builder.playtest', 'Playtest')}
              </Button>
              {currentUserId && currentUserId === deck.ownerId && (
                <Button variant="outline-primary" onClick={() => navigate(`/decks/build/${deck.id}`)}>
                  {t('deckDetail.edit', 'Edit')}
                </Button>
              )}
            </Stack>
          </div>
        </Card.Body>
      </Card>

      {report && <LegalityPanel report={report} />}

      <DeckToolbar
        view={view} onView={setView}
        groupBy={groupBy} onGroupBy={setGroupBy}
        sortBy={sortBy} onSortBy={setSortBy}
        imageSize={imageSize} onImageSize={setImageSize}
        format={deck.format} onFormat={() => undefined}
        formats={formats}
      />

      <div className="builder-canvas">
        {deck.cards.length === 0 ? (
          <div className="builder-empty">
            <span className="builder-empty__glyph" aria-hidden="true">✦</span>
            <p>{t('builder.empty')}</p>
          </div>
        ) : view === 'stacks' ? (
          <StacksView {...viewProps} />
        ) : view === 'grid' ? (
          <GridView {...viewProps} />
        ) : view === 'text' ? (
          <TextView {...viewProps} />
        ) : (
          <TableView {...viewProps} />
        )}
      </div>
    </Container>
  );
};
