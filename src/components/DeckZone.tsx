import { Badge, Button, Card, Col, ListGroup, Row, Stack } from 'react-bootstrap';
import { useDeckStore } from '../stores/deckStore';

export const DeckZone = () => {
  const { decks, currentDeckId, createDeck } = useDeckStore();

  const currentDeck = decks.find((d) => d.id === currentDeckId);

  if (!currentDeck) {
    return (
      <Card className="text-center deck-card">
        <Card.Body>
          <Card.Title>No hay mazo seleccionado</Card.Title>
          <Card.Text>Crea uno para empezar a construir tu deck Commander.</Card.Text>
          <Button variant="success" onClick={() => createDeck('Nuevo Mazo Commander')}>
            Crear Nuevo Mazo
          </Button>
        </Card.Body>
      </Card>
    );
  }

  const { commander, main, sideboard, maybeboard, name } = currentDeck;

  const totalCards = main.reduce((sum, c) => sum + c.quantity, 0) +
                    sideboard.reduce((sum, c) => sum + c.quantity, 0) +
                    maybeboard.reduce((sum, c) => sum + c.quantity, 0) +
                    (commander ? commander.quantity : 0);

  return (
    <div className="deck-zone">
      <Stack direction="horizontal" className="mb-3" gap={2}>
        <h2 className="mb-0">{name}</h2>
        <Badge bg="secondary">{totalCards} cartas</Badge>
      </Stack>

      {commander && (
        <Card className="mb-4 deck-card">
          <Card.Body>
            <Card.Title>Comandante</Card.Title>
            <Row className="align-items-center g-3">
              <Col xs="auto">
                {commander.card.image_uris?.small && (
                  <img
                    src={commander.card.image_uris.small}
                    alt={commander.card.name}
                    className="commander-image"
                  />
                )}
              </Col>
              <Col>
                <h5 className="mb-1">{commander.card.name}</h5>
                <div className="text-muted small">{commander.card.type_line}</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      <Card className="deck-card">
        <Card.Body>
          <Card.Title>Maindeck</Card.Title>
          <Card.Subtitle className="text-muted mb-3">
            {main.reduce((s, c) => s + c.quantity, 0)} cartas
          </Card.Subtitle>

          {main.length > 0 ? (
            <ListGroup variant="flush">
              {main.map((entry) => (
                <ListGroup.Item key={entry.card.id} className="deck-list-item">
                  <span>{entry.quantity}× {entry.card.name}</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <div className="text-muted">Aún sin cartas en el maindeck.</div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};