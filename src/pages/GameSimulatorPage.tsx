import { useEffect, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Row, Stack } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createRoom,
  fetchRoom,
  joinRoom,
  setGameError,
  setGameState,
  type ActionType,
  type GameAction,
} from '../features/game/gameSlice';
import { connectToGame, type GameConnection } from '../services/gameSocket';
import { GameBoard } from '../components/game/GameBoard';

const NewGameForm = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState('My Game');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [deckId, setDeckId] = useState('');

  const onCreate = async () => {
    const result = await dispatch(createRoom({ name, maxPlayers, deckId: deckId || undefined }));
    if (createRoom.fulfilled.match(result)) {
      navigate(`/play/${result.payload.roomId}`);
    }
  };

  return (
    <Card className="deck-card" style={{ maxWidth: 480, margin: '2rem auto' }}>
      <Card.Body>
        <Card.Title>New game</Card.Title>
        <Form.Label>Name</Form.Label>
        <Form.Control className="mb-2" value={name} onChange={(e) => setName(e.target.value)} />
        <Form.Label>Players (1–4)</Form.Label>
        <Form.Control
          className="mb-2"
          type="number"
          min={1}
          max={4}
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
        />
        <Form.Label>Deck id (optional — blank uses a generic library)</Form.Label>
        <Form.Control className="mb-3" value={deckId} onChange={(e) => setDeckId(e.target.value)} />
        <Button variant="success" onClick={onCreate}>Create &amp; play</Button>
      </Card.Body>
    </Card>
  );
};

export const GameSimulatorPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { current, error } = useAppSelector((s) => s.game);
  const myPlayerId = useAppSelector((s) => s.auth.userId);
  const connRef = useRef<GameConnection | null>(null);

  // Join the room (REST), restore state, then open the socket.io stream.
  useEffect(() => {
    if (!roomId) return;
    let active = true;

    dispatch(joinRoom({ roomId })).then(() => {
      if (active) dispatch(fetchRoom(roomId));
    });

    const conn = connectToGame(
      roomId,
      (state) => dispatch(setGameState(state)),
      (message) => dispatch(setGameError(message)),
    );
    connRef.current = conn;

    return () => {
      active = false;
      conn.disconnect();
      connRef.current = null;
    };
  }, [dispatch, roomId]);

  if (!roomId) {
    return <NewGameForm />;
  }

  const send = (type: ActionType, extra: Partial<GameAction> = {}) => {
    if (!myPlayerId || !connRef.current) return;
    connRef.current.sendAction({ type, playerId: myPlayerId, ...extra });
  };

  const me = current?.players.find((p) => p.playerId === myPlayerId);
  const opponents = current?.players.filter((p) => p.playerId !== myPlayerId) ?? [];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container-fluid py-3">
        <Stack direction="horizontal" gap={2} className="mb-3">
          <h3 className="mb-0">{current?.name ?? 'Game'}</h3>
          <span className="text-muted">Room {roomId} · Turn {current?.turn ?? '—'}</span>
          <Button size="sm" variant="outline-secondary" className="ms-auto" onClick={() => navigate('/play')}>
            New game
          </Button>
        </Stack>

        {error && <Alert variant="warning" onClose={() => dispatch(setGameError(''))} dismissible>{error}</Alert>}

        <Row>
          <Col lg={8}>
            {me ? (
              <>
                <Stack direction="horizontal" gap={2} className="mb-3 flex-wrap">
                  <Button size="sm" onClick={() => send('SHUFFLE')}>Shuffle</Button>
                  <Button size="sm" onClick={() => send('DRAW', { count: 1 })}>Draw</Button>
                  <Button size="sm" onClick={() => send('DRAW', { count: 7 })}>Draw 7</Button>
                  <Button size="sm" variant="warning" onClick={() => send('MULLIGAN')}>Mulligan</Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => send('END_TURN')}>End turn</Button>
                </Stack>
                <GameBoard
                  player={me}
                  isActive={current?.activePlayerId === me.playerId}
                  onPlayCard={(id) => send('PLAY_CARD', { cardInstanceId: id })}
                  onTapCard={(id) => send('TAP', { cardInstanceId: id })}
                />
              </>
            ) : (
              <Alert variant="info">Connecting to the table…</Alert>
            )}
          </Col>

          <Col lg={4}>
            <h6 className="text-muted">Opponents</h6>
            {opponents.length === 0 && <p className="text-muted small">Solitaire game.</p>}
            {opponents.map((p) => (
              <GameBoard
                key={p.playerId}
                player={p}
                isActive={current?.activePlayerId === p.playerId}
                onPlayCard={() => undefined}
                onTapCard={() => undefined}
              />
            ))}
          </Col>
        </Row>
      </div>
    </DndProvider>
  );
};
