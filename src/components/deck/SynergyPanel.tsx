import { Badge, Button, Card, ListGroup, Stack } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addCardToDraft, fetchSuggestions } from '../../features/deck/deckSlice';

/**
 * Shows server-computed synergies (keyword co-occurrence) plus on-demand card suggestions
 * from ai-service (with a deterministic mock fallback when ai-service is down).
 */
export const SynergyPanel = ({ deckId }: { deckId: string | null }) => {
  const dispatch = useAppDispatch();
  const { current, suggestions } = useAppSelector((s) => s.deck);
  const synergies = current?.stats.synergies ?? [];

  return (
    <Card className="deck-card">
      <Card.Body>
        <Card.Title>Synergies</Card.Title>
        {synergies.length > 0 ? (
          <Stack direction="horizontal" gap={2} className="flex-wrap mb-3">
            {synergies.map((syn) => (
              <Badge bg="info" key={syn.keyword}>
                {syn.keyword} ×{syn.cardCount}
              </Badge>
            ))}
          </Stack>
        ) : (
          <p className="text-muted small">
            Save the deck to compute synergies from card text.
          </p>
        )}

        <div className="d-flex justify-content-between align-items-center mt-2">
          <Card.Subtitle className="text-muted">Suggestions</Card.Subtitle>
          <Button
            size="sm"
            variant="outline-primary"
            disabled={!deckId}
            onClick={() => deckId && dispatch(fetchSuggestions(deckId))}
          >
            Get suggestions
          </Button>
        </div>

        <ListGroup variant="flush" className="mt-2">
          {suggestions.map((sug) => (
            <ListGroup.Item
              key={sug.scryfallId}
              className="d-flex justify-content-between align-items-center"
            >
              <span>
                <strong>{sug.name}</strong>
                <span className="text-muted small d-block">{sug.reason}</span>
                <Badge bg={sug.source === 'ai' ? 'success' : 'secondary'} className="mt-1">
                  {sug.source}
                </Badge>
              </span>
              <Button
                size="sm"
                variant="outline-success"
                onClick={() =>
                  dispatch(
                    addCardToDraft({
                      id: sug.scryfallId,
                      name: sug.name,
                      manaCost: '',
                      cmc: 0,
                      colors: [],
                      colorIdentity: [],
                      typeLine: '',
                      oracleText: '',
                      power: null,
                      toughness: null,
                      imageUris: sug.imageUrl
                        ? { small: sug.imageUrl, normal: sug.imageUrl, large: null, artCrop: null }
                        : null,
                      setName: '',
                      rarity: '',
                    }),
                  )
                }
              >
                +
              </Button>
            </ListGroup.Item>
          ))}
          {suggestions.length === 0 && (
            <ListGroup.Item className="text-muted small">No suggestions yet.</ListGroup.Item>
          )}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};
