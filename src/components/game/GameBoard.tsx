import { useDrag, useDrop } from 'react-dnd';
import { Badge, Button, Card, Stack } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { GameCard, PlayerState } from '../../features/game/gameSlice';

const CARD_DND = 'GAME_CARD';

const HandCard = ({ card }: { card: GameCard }) => {
  const { t } = useTranslation();
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
      title={t('game.dragHint')}
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

/**
 * A single player's zones. Hand cards drag onto the battlefield; battlefield cards tap.
 *
 * Zone sizes come from `librarySize`/`handSize` rather than the arrays: the server only sends the
 * contents a given viewer is entitled to, so an opponent's hand arrives empty with a size beside
 * it and is drawn face-down.
 */
export const GameBoard = ({ player, isActive, onPlayCard, onTapCard }: BoardProps) => {
  const { t } = useTranslation();
  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: CARD_DND,
      drop: (item: GameCard) => onPlayCard(item.instanceId),
      collect: (m) => ({ isOver: m.isOver() }),
    }),
    [onPlayCard],
  );

  const handIsMine = player.hand.length > 0 || player.handSize === 0;

  return (
    <Card className={`deck-card mb-3 ${isActive ? 'border-primary' : ''}`}>
      <Card.Body>
        <Stack direction="horizontal" gap={2} className="mb-2">
          <Card.Title className="mb-0">{player.playerName}</Card.Title>
          {isActive && <Badge bg="primary">{t('game.active')}</Badge>}
          <Badge bg="danger" className="ms-auto">♥ {player.life}</Badge>
          <Badge bg="secondary">{t('game.library')} {player.librarySize}</Badge>
          <Badge bg="secondary">{t('game.graveyard')} {player.graveyard.length}</Badge>
        </Stack>

        <div className="mb-2">
          <strong className="small text-muted">{t('game.hand')} ({player.handSize})</strong>
          <div>
            {player.handSize === 0 && <span className="text-muted small">{t('game.empty')}</span>}
            {handIsMine
              ? player.hand.map((c) => <HandCard key={c.instanceId} card={c} />)
              : Array.from({ length: player.handSize }, (_, i) => (
                  <span key={i} className="game-card-back" aria-hidden="true" />
                ))}
          </div>
        </div>

        <div
          ref={dropRef as unknown as React.Ref<HTMLDivElement>}
          style={{
            minHeight: 70,
            borderRadius: 6,
            padding: 8,
            background: isOver ? 'rgba(216,162,74,0.12)' : 'rgba(255,255,255,0.03)',
            outline: isOver ? '2px dashed var(--accent)' : '1px dashed rgba(255,255,255,0.14)',
          }}
        >
          <strong className="small text-muted">
            {t('game.battlefield')} ({player.battlefield.length})
          </strong>
          <div>
            {player.battlefield.length === 0
              ? <span className="text-muted small d-block">{t('game.dropHere')}</span>
              : player.battlefield.map((c) => (
                  <Button
                    key={c.instanceId}
                    size="sm"
                    variant={c.tapped ? 'secondary' : 'outline-secondary'}
                    className="me-1 mb-1"
                    onClick={() => onTapCard(c.instanceId)}
                    title={t('game.tapHint')}
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
