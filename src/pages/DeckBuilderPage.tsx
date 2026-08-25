import { useEffect, useMemo, useState } from 'react';
import { SaveStatus } from '../components/deck/SaveStatus';
import { ImportExportModal } from '../components/deck/ImportExportModal';
import { useAutoSave } from '../features/deck/useAutoSave';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Form, Spinner, Stack } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { apiClient } from '../api/client';
import {
  deleteDeck, fetchDeck, fetchCardByName, fetchCommanderEligible, saveDraft, setDraftMeta,
  type DeckVisibility, type ScryfallCard,
} from '../features/deck/deckSlice';
import { evaluateDraft, rulesFor, FORMATS, type FormatRules, type CommanderInfo } from '../data/formats';
import { AddCardsModal } from '../components/deck/AddCardsModal';
import { CategoryManager } from '../components/deck/CategoryManager';
import { DeckStatsPanel } from '../components/deck/DeckStatsPanel';
import { DeckMetaBar } from '../components/deck/DeckMetaBar';
import { CommanderAutocomplete } from '../components/deck/CommanderAutocomplete';
import { QuickAddBar } from '../components/deck/QuickAddBar';
import { DeckToolbar } from '../components/deck/DeckToolbar';
import { LegalityPanel } from '../components/deck/LegalityPanel';
import { StacksView, GridView, TextView, TableView } from '../components/deck/DeckViews';
import { CardContextMenuProvider } from '../components/deck/CardContextMenu';
import { cardMeta, toViewCard, type GroupBy, type ImageSize, type SortBy, type ViewMode } from '../components/deck/deckView';

const VISIBILITIES: DeckVisibility[] = ['PRIVATE', 'PUBLIC'];

export const DeckBuilderPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { draft, saveStatus, current, status, error, priceSource, priceFoil } = useAppSelector((s) => s.deck);
  const currentUserId = useAppSelector((s) => s.auth.userId);
  const isOwner = !draft.id || (currentUserId !== null && current?.ownerId === currentUserId);
  const readonly = !isOwner;

  useAutoSave();

  const [view, setView] = useState<ViewMode>('stacks');
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [imageSize, setImageSize] = useState<ImageSize>('md');
  const [formats, setFormats] = useState<FormatRules[]>(FORMATS);
  const [commanderCard, setCommanderCard] = useState<ScryfallCard | null>(null);
  const [commanderEligible, setCommanderEligible] = useState<boolean | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showAddCards, setShowAddCards] = useState(false);

  useEffect(() => {
    // Backend master data is authoritative; fall back to the local mirror if it can't be reached.
    apiClient.get<FormatRules[]>('/api/decks/formats')
      .then((r) => { if (Array.isArray(r.data) && r.data.length) setFormats(r.data); })
      .catch(() => undefined);
  }, [dispatch]);

  useEffect(() => {
    if (!id) {
      navigate('/decks/new', { replace: true });
      return;
    }
    dispatch(fetchDeck(id));
  }, [dispatch, id, navigate]);

  // Resolve commander card by name (for its image + colour identity) and its is:commander verdict.
  useEffect(() => {
    const name = draft.commanderName.trim();
    if (!rulesFor(draft.format).requiresCommander || !name) {
      setCommanderCard(null);
      setCommanderEligible(null);
      return;
    }
    let alive = true;
    setCommanderEligible(null);
    dispatch(fetchCardByName(name))
      .unwrap()
      .then((c) => { if (alive) setCommanderCard(c); })
      .catch(() => { if (alive) setCommanderCard(null); });
    dispatch(fetchCommanderEligible(name))
      .unwrap()
      .then((e) => { if (alive) setCommanderEligible(e); })
      .catch(() => { if (alive) setCommanderEligible(null); });
    return () => { alive = false; };
  }, [dispatch, draft.format, draft.commanderName]);

  // Resolved commander (identity + eligibility) for the live legality check.
  const commander = useMemo<CommanderInfo | null>(() => {
    if (!rulesFor(draft.format).requiresCommander) return null;
    return {
      name: draft.commanderName,
      colorIdentity: commanderCard?.colorIdentity ?? null,
      eligible: commanderEligible,
    };
  }, [draft.format, draft.commanderName, commanderCard, commanderEligible]);

  const report = useMemo(
    () => evaluateDraft(
      draft.format,
      draft.cards.map((c) => ({ qty: c.qty, name: c.name, meta: cardMeta(c) })),
      commander,
    ),
    [draft.format, draft.cards, commander],
  );

  const flagged = useMemo(
    () => new Set(report.violations.map((v) => v.cardName).filter((n): n is string => Boolean(n))),
    [report],
  );

  const onSave = async () => {
    if (!draft.id) return;
    await dispatch(saveDraft(draft));
  };

  const onDelete = async () => {
    if (draft.id) {
      await dispatch(deleteDeck(draft.id));
      navigate('/decks/build');
    }
  };

  if (status === 'loading' && id && !draft.id) {
    return (
      <div className="page-container text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  const viewProps = {
    cards: draft.cards,
    groupBy,
    sortBy,
    imageSize,
    flagged,
    categories: draft.categories,
    readonly,
    commanderCard: commanderCard ? toViewCard(commanderCard) : null,
    priceSource,
    priceFoil,
  };

  return (
    <DndProvider backend={HTML5Backend}>
     <CardContextMenuProvider readonly={readonly}>
      <div className="builder container-fluid py-3">
        <div className="row g-3">
          {/* Full-width builder: meta + legality + toolbar + active view */}
          <div className="col-12">
            {status === 'failed' && error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}
            {report.violations.some((v) => v.type === 'COMMANDER') && (
              <Alert variant="warning" className="mb-3">
                {report.violations.find((v) => v.type === 'COMMANDER')?.cardName
                  ? t('builder.commanderInvalidWarning', 'The chosen commander cannot be a commander — it must be a legendary creature (or a card that says it can be your commander).')
                  : t('builder.commanderMissingWarning', 'This format requires a commander.')}
              </Alert>
            )}
            {report.violations.some((v) => v.type === 'COLOR_IDENTITY') && (
              <Alert variant="warning" className="mb-3">
                {t('builder.colorIdentityWarning', 'One or more cards are outside the commander colour identity.')}
              </Alert>
            )}
            <Card className="deck-card mb-3">
              <Card.Body>
                {readonly && draft.id && (
                  <Alert variant="secondary" className="py-2 px-3 mb-3">
                    {t('builder.readOnly', 'You are viewing this deck in read-only mode.')}
                  </Alert>
                )}
                <div className="builder-meta">
                  {readonly ? (
                    <h1 className="builder-meta__name h4 mb-0">{draft.name}</h1>
                  ) : (
                    <Form.Control
                      className="builder-meta__name"
                      value={draft.name}
                      placeholder={t('builder.deckName')}
                      onChange={(e) => dispatch(setDraftMeta({ name: e.target.value }))}
                      disabled={readonly}
                    />
                  )}
                  {rulesFor(draft.format).requiresCommander && (
                    <CommanderAutocomplete
                      value={draft.commanderName}
                      onChange={(name) => dispatch(setDraftMeta({ commanderName: name }))}
                      placeholder={t('builder.commander')}
                      disabled={readonly}
                    />
                  )}

                  {readonly ? (
                    <span className="badge-soft">{t(`builder.vis_${draft.visibility}`)}</span>
                  ) : (
                    <Form.Select
                      value={draft.visibility}
                      onChange={(e) => dispatch(setDraftMeta({ visibility: e.target.value as DeckVisibility }))}
                      disabled={readonly}
                    >
                      {VISIBILITIES.map((v) => <option key={v} value={v}>{t(`builder.vis_${v}`)}</option>)}
                    </Form.Select>
                  )}
                  <Stack direction="horizontal" gap={2} className="align-items-center flex-wrap">
                    <Button variant="outline-secondary" onClick={() => navigate('/decks')}>
                      {t('builder.myDecks', 'My decks')}
                    </Button>
                    {!readonly && (
                      <Button variant="primary" onClick={() => setShowAddCards(true)}>
                        + {t('builder.addCards', 'Add cards')}
                      </Button>
                    )}
                    {!readonly && <SaveStatus />}
                    {!readonly && (
                      <Button variant="success" onClick={onSave} disabled={saveStatus === 'saving' || !draft.id}>
                        {t('builder.save')}
                      </Button>
                    )}
                    {!readonly && draft.id && (
                      <Button variant="outline-secondary" onClick={() => setShowImportExport(true)}>
                        {t('builder.importExport', 'Import / Export')}
                      </Button>
                    )}
                    {draft.id && (
                      <Button variant="outline-info" onClick={() => navigate(`/decks/${draft.id}/playtest`)}>
                        {t('builder.playtest', 'Playtest')}
                      </Button>
                    )}
                    {!readonly && draft.id && (
                      <Button variant="outline-danger" onClick={onDelete}>{t('builder.delete')}</Button>
                    )}
                  </Stack>
                </div>
                <DeckMetaBar deckId={draft.id} visibility={draft.visibility} isOwner={isOwner} />
              </Card.Body>
            </Card>

            {!readonly && <QuickAddBar />}

            {!readonly && (
              <div className="d-flex justify-content-end mb-2">
                <CategoryManager />
              </div>
            )}

            <LegalityPanel report={report} />

            <DeckToolbar
              view={view} onView={setView}
              groupBy={groupBy} onGroupBy={setGroupBy}
              sortBy={sortBy} onSortBy={setSortBy}
              imageSize={imageSize} onImageSize={setImageSize}
              format={draft.format} onFormat={(f) => dispatch(setDraftMeta({ format: f }))}
              formats={formats}
              readOnly={readonly}
            />

            <div className="builder-canvas">
              {draft.cards.length === 0 && !viewProps.commanderCard ? (
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
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-12">
            <DeckStatsPanel cards={draft.cards} categories={draft.categories} stats={current?.stats} />
          </div>
        </div>
      </div>

      <ImportExportModal show={showImportExport} onHide={() => setShowImportExport(false)} />
      <AddCardsModal show={showAddCards} onHide={() => setShowAddCards(false)} deckId={draft.id} />
     </CardContextMenuProvider>
    </DndProvider>
  );
};
