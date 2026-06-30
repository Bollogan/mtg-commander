import { useEffect } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, Col, Form, ListGroup, Row, Stack } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addCardToDraft,
  changeQty,
  deleteDeck,
  fetchDeck,
  fetchMyDecks,
  newDraft,
  removeCardFromDraft,
  saveDraft,
  setDraftMeta,
  type DeckVisibility,
  type ScryfallCard,
} from '../features/deck/deckSlice';
import { CardSearch, CARD_DND_TYPE } from '../components/deck/CardSearch';
import { ManaChart } from '../components/deck/ManaChart';
import { SynergyPanel } from '../components/deck/SynergyPanel';

const VISIBILITIES: DeckVisibility[] = ['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC'];

const DeckDropZone = () => {
  const dispatch = useAppDispatch();
  const cards = useAppSelector((s) => s.deck.draft.cards);
  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: CARD_DND_TYPE,
      drop: (item: ScryfallCard) => dispatch(addCardToDraft(item)),
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [],
  );

  const total = cards.reduce((sum, c) => sum + c.qty, 0);

  return (
    <Card
      ref={dropRef as unknown as React.Ref<HTMLDivElement>}
      className="deck-card"
      style={{ outline: isOver ? '2px dashed var(--accent)' : 'none' }}
    >
      <Card.Body>
        <Stack direction="horizontal" gap={2} className="mb-3">
          <Card.Title className="mb-0">Deck list</Card.Title>
          <Badge bg="secondary">{total} cards</Badge>
        </Stack>

        {cards.length === 0 ? (
          <p className="text-muted">Drag cards here from search, or use the + buttons.</p>
        ) : (
          <ListGroup variant="flush" style={{ maxHeight: 420, overflowY: 'auto' }}>
            {cards.map((card) => (
              <ListGroup.Item
                key={card.scryfallId}
                className="d-flex justify-content-between align-items-center"
              >
                <span className="text-truncate me-2">
                  {card.qty}× {card.name}
                  {card.typeLine ? (
                    <span className="text-muted small ms-2">{card.typeLine}</span>
                  ) : null}
                </span>
                <Stack direction="horizontal" gap={1}>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => dispatch(changeQty({ scryfallId: card.scryfallId, delta: -1 }))}
                  >
                    −
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => dispatch(changeQty({ scryfallId: card.scryfallId, delta: 1 }))}
                  >
                    +
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => dispatch(removeCardFromDraft(card.scryfallId))}
                  >
                    ×
                  </Button>
                </Stack>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
};

export const DeckBuilderPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { draft, current, myDecks, status } = useAppSelector((s) => s.deck);

  useEffect(() => {
    dispatch(fetchMyDecks());
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      dispatch(fetchDeck(id));
    } else {
      dispatch(newDraft());
    }
  }, [dispatch, id]);

  const onSave = async () => {
    const result = await dispatch(saveDraft(draft));
    if (saveDraft.fulfilled.match(result) && !id) {
      navigate(`/decks/build/${result.payload.id}`);
    }
  };

  const onDelete = async () => {
    if (draft.id) {
      await dispatch(deleteDeck(draft.id));
      navigate('/decks/build');
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container-fluid py-3">
        <Row className="g-3">
          {/* Left: card search */}
          <Col lg={3}>
            <Card className="deck-card">
              <Card.Body>
                <Card.Title>Card search</Card.Title>
                <CardSearch />
              </Card.Body>
            </Card>
          </Col>

          {/* Center: deck meta + list + mana chart */}
          <Col lg={6}>
            <Card className="deck-card mb-3">
              <Card.Body>
                <Form>
                  <Row className="g-2">
                    <Col md={7}>
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        value={draft.name}
                        onChange={(e) => dispatch(setDraftMeta({ name: e.target.value }))}
                      />
                    </Col>
                    <Col md={5}>
                      <Form.Label>Format</Form.Label>
                      <Form.Control
                        value={draft.format}
                        onChange={(e) => dispatch(setDraftMeta({ format: e.target.value }))}
                      />
                    </Col>
                    <Col md={7}>
                      <Form.Label>Commander</Form.Label>
                      <Form.Control
                        value={draft.commanderName}
                        onChange={(e) => dispatch(setDraftMeta({ commanderName: e.target.value }))}
                      />
                    </Col>
                    <Col md={5}>
                      <Form.Label>Visibility</Form.Label>
                      <Form.Select
                        value={draft.visibility}
                        onChange={(e) =>
                          dispatch(setDraftMeta({ visibility: e.target.value as DeckVisibility }))
                        }
                      >
                        {VISIBILITIES.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                  </Row>
                  <Stack direction="horizontal" gap={2} className="mt-3">
                    <Button variant="success" onClick={onSave} disabled={status === 'loading'}>
                      Save deck
                    </Button>
                    {draft.id && (
                      <Button variant="outline-danger" onClick={onDelete}>
                        Delete
                      </Button>
                    )}
                  </Stack>
                </Form>
              </Card.Body>
            </Card>

            <DeckDropZone />

            <Card className="deck-card mt-3">
              <Card.Body>
                <Card.Title>Mana curve</Card.Title>
                <ManaChart cards={draft.cards} />
                {current && (
                  <div className="text-muted small mt-2">
                    Avg CMC (non-land): {current.stats.averageCmc} · Colors:{' '}
                    {Object.entries(current.stats.colorDistribution)
                      .filter(([, n]) => n > 0)
                      .map(([c, n]) => `${c}:${n}`)
                      .join('  ')}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Right: synergies + my decks */}
          <Col lg={3}>
            <SynergyPanel deckId={draft.id} />

            <Card className="deck-card mt-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Card.Title className="mb-0">My decks</Card.Title>
                  <Button size="sm" variant="outline-primary" onClick={() => navigate('/decks/build')}>
                    + New
                  </Button>
                </div>
                <ListGroup variant="flush">
                  {myDecks.map((d) => (
                    <ListGroup.Item
                      key={d.id}
                      action
                      active={d.id === draft.id}
                      onClick={() => navigate(`/decks/build/${d.id}`)}
                    >
                      {d.name} <span className="text-muted small">({d.totalCards})</span>
                    </ListGroup.Item>
                  ))}
                  {myDecks.length === 0 && (
                    <ListGroup.Item className="text-muted small">No decks yet.</ListGroup.Item>
                  )}
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </DndProvider>
  );
};
