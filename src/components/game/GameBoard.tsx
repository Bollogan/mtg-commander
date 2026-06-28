import { useDrag, useDrop } from 'react-dnd';
import { Badge, Button, Card, Stack } from 'react-bootstrap';
import type { GameCard, PlayerState } from '../../features/game/gameSlice';

const CARD_DND = 'GAME_CARD';

const HandCard = ({ card }: { card: GameCard }) => {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: CARD_DND,
      item: card,
      collect: (m) => ({ isDragging: m.isDragging() }),
    }),
    [card],
  );
  return (
    <span
      ref={dragRef as unknown as React.Ref<HTMLSpanElement>}
      className="badge bg-light text-dark border me-1 mb-1"
      style={{ cursor: 'grab', opacity: isDragging ? 0.4 : 1 }}
      title="Drag onto the battlefield to play"
    >
      {card.name}
    </span>
  );
};

interface BoardProps {
  player: PlayerState;
  isActive: boolean;
  onPlayCard: (instanceId: string) => void;
  onTapCard: (instanceId: string) => void;
}

/** A single player's zones. Hand cards drag onto the battlefield; battlefield cards tap. */
export const GameBoard = ({ player, isActive, onPlayCard, onTapCard }: BoardProps) => {
  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: CARD_DND,
      drop: (item: GameCard) => onPlayCard(item.instanceId),
      collect: (m) => ({ isOver: m.isOver() }),
    }),
    [onPlayCard],
  );

  return (
    <Card className={`deck-card mb-3 ${isActive ? 'border-primary' : ''}`}>
      <Card.Body>
        <Stack direction="horizontal" gap={2} className="mb-2">
          <Card.Title className="mb-0">{player.playerName}</Card.Title>
          {isActive && <Badge bg="primary">Active</Badge>}
          <Badge bg="danger" className="ms-auto">♥ {player.life}</Badge>
          <Badge bg="secondary">Library {player.library.length}</Badge>
          <Badge bg="secondary">GY {player.graveyard.length}</Badge>
        </Stack>

        <div className="mb-2">
          <strong className="small text-muted">Hand ({player.hand.length})</strong>
          <div>
            {player.hand.length === 0
              ? <span className="text-muted small">empty</span>
              : player.hand.map((c) => <HandCard key={c.instanceId} card={c} />)}
          </div>
        </div>

        <div
          ref={dropRef as unknown as React.Ref<HTMLDivElement>}
          style={{
            minHeight: 70,
            borderRadius: 6,
            padding: 8,
            background: isOver ? 'rgba(124,131,255,0.12)' : 'rgba(255,255,255,0.03)',
            outline: isOver ? '2px dashed #7c83ff' : '1px dashed rgba(255,255,255,0.14)',
          }}
        >
          <strong className="small text-muted">Battlefield ({player.battlefield.length})</strong>
          <div>
            {player.battlefield.length === 0
              ? <span className="text-muted small d-block">drop cards here</span>
              : player.battlefield.map((c) => (
                  <Button
                    key={c.instanceId}
                    size="sm"
                    variant={c.tapped ? 'secondary' : 'outline-secondary'}
                    className="me-1 mb-1"
                    onClick={() => onTapCard(c.instanceId)}
                    title="Click to tap/untap"
                  >
                    {c.name}{c.tapped ? ' ⟳' : ''}
                  </Button>
                ))}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};
