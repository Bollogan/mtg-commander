import { useEffect, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Col, Form, Row, Stack } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMyDecks } from '../features/deck/deckSlice';
import {
  clearGame,
  createRoom,
  fetchPublicLobbies,
  joinRoom,
  setGameError,
  setGameState,
  setRoomClosed,
  type ActionType,
  type GameAction,
} from '../features/game/gameSlice';
import { connectToGame, type GameConnection } from '../services/gameSocket';
import { GameBoard } from '../components/game/GameBoard';
import { GameChat } from '../components/game/GameChat';
import { GameLobby } from '../components/game/GameLobby';

/** Target of the invite link (`/join/:roomId`); the room page does the actual joining. */
export const JoinRoomRedirect = () => {
  const { roomId } = useParams<{ roomId: string }>();
  return <Navigate to={`/play/${roomId ?? ''}`} replace />;
};

/** Landing screen: open a table, drop into a public one, or type an invite code. */
const NewGameScreen = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const myDecks = useAppSelector((s) => s.deck.myDecks);
  const lobbies = useAppSelector((s) => s.game.lobbies);
  const error = useAppSelector((s) => s.game.error);

  const [name, setName] = useState(t('game.defaultName'));
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [deckId, setDeckId] = useState(searchParams.get('deckId') ?? '');
  const [publicRoom, setPublicRoom] = useState(true);
  const [code, setCode] = useState('');

  useEffect(() => {
    dispatch(fetchMyDecks());
    dispatch(fetchPublicLobbies());
  }, [dispatch]);

  const onCreate = async () => {
    const result = await dispatch(createRoom({
      name, maxPlayers, deckId: deckId || undefined, publicRoom,
    }));
    if (createRoom.fulfilled.match(result)) {
      navigate(`/play/${result.payload.roomId}`);
    }
  };

  return (
    <div className="container py-3">
      <div className="page-header">
        <h1>{t('game.playTitle')}</h1>
        <p>{t('game.playLead')}</p>
      </div>

      {error && (
        <Alert variant="warning" dismissible onClose={() => dispatch(setGameError(''))}>
          {error}
        </Alert>
      )}

      <Row className="g-4">
        <Col lg={6}>
          <Card className="deck-card">
            <Card.Body>
              <Card.Title>{t('game.newGame')}</Card.Title>

              <Form.Label className="small text-muted">{t('game.name')}</Form.Label>
              <Form.Control className="mb-3" value={name} maxLength={60}
                            onChange={(e) => setName(e.target.value)} />

              <Form.Label className="small text-muted">{t('game.seats')}</Form.Label>
              <Form.Select className="mb-3" value={maxPlayers}
                           onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{t('game.seatCount', { count: n })}</option>
                ))}
              </Form.Select>

              <Form.Label className="small text-muted">{t('game.deck')}</Form.Label>
              <Form.Select className="mb-3" value={deckId}
                           onChange={(e) => setDeckId(e.target.value)}>
                <option value="">{t('game.genericDeck')}</option>
                {myDecks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Form.Select>

              <Form.Check
                type="switch"
                id="public-room"
                className="mb-3"
                checked={publicRoom}
                onChange={(e) => setPublicRoom(e.target.checked)}
                label={t('game.publicSwitch')}
              />

              <Button variant="success" onClick={onCreate}>{t('game.create')}</Button>
            </Card.Body>
          </Card>

          <Card className="deck-card mt-3">
            <Card.Body>
              <Card.Title>{t('game.haveCode')}</Card.Title>
              <Form
                className="d-flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = code.trim().toUpperCase();
                  if (trimmed) navigate(`/play/${trimmed}`);
                }}
              >
                <Form.Control
                  value={code}
                  maxLength={12}
                  placeholder={t('game.codePlaceholder')}
                  aria-label={t('game.codePlaceholder')}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                <Button type="submit" variant="outline-secondary" disabled={!code.trim()}>
                  {t('game.join')}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <div className="section-head">
            <h2 className="h5 mb-0">{t('game.openTables')}</h2>
            <span className="section-count">{lobbies.length}</span>
            <Button size="sm" variant="outline-secondary" className="ms-auto"
                    onClick={() => dispatch(fetchPublicLobbies())}>
              {t('game.refresh')}
            </Button>
          </div>

          {lobbies.length === 0 ? (
            <div className="grid-empty">
              <span className="grid-empty__glyph" aria-hidden="true">◇</span>
              <p className="mb-0">{t('game.noOpenTables')}</p>
            </div>
          ) : (
            <ul className="thread-list">
              {lobbies.map((room) => (
                <li key={room.roomId} className="thread-row"
                    onClick={() => navigate(`/play/${room.roomId}`)}>
                  <div>
                    <strong>{room.name}</strong>
                    <div className="text-muted small">
                      {t('game.hostedBy', { name: room.hostName })}
                    </div>
                  </div>
                  <Badge bg="secondary" className="ms-auto">
                    {room.players}/{room.maxPlayers}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Col>
      </Row>
    </div>
  );
};

/** The live table, once the host has started the game. */
const GameTable = ({ connection }: { connection: GameConnection | null }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { current, error } = useAppSelector((s) => s.game);
  const myPlayerId = useAppSelector((s) => s.auth.userId);

  const send = (type: ActionType, extra: Partial<GameAction> = {}) => {
    if (!myPlayerId || !connection) return;
    connection.sendAction({ type, playerId: myPlayerId, ...extra });
  };

  const me = current?.players.find((p) => p.playerId === myPlayerId);
  const opponents = current?.players.filter((p) => p.playerId !== myPlayerId) ?? [];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container-fluid py-3">
        <Stack direction="horizontal" gap={2} className="mb-3 flex-wrap">
          <h3 className="mb-0">{current?.name ?? t('game.table')}</h3>
          <span className="text-muted">
            {t('game.roomTurn', { room: current?.roomId ?? '—', turn: current?.turn ?? '—' })}
          </span>
          <Button size="sm" variant="outline-secondary" className="ms-auto"
                  onClick={() => { connection?.leave(); navigate('/play'); }}>
            {t('game.leave')}
          </Button>
        </Stack>

        {error && (
          <Alert variant="warning" onClose={() => dispatch(setGameError(''))} dismissible>
            {error}
          </Alert>
        )}

        <Row>
          <Col lg={8}>
            {me ? (
              <>
                <Stack direction="horizontal" gap={2} className="mb-3 flex-wrap">
                  <Button size="sm" onClick={() => send('SHUFFLE')}>{t('game.shuffle')}</Button>
                  <Button size="sm" onClick={() => send('DRAW', { count: 1 })}>{t('game.draw')}</Button>
                  <Button size="sm" onClick={() => send('DRAW', { count: 7 })}>{t('game.draw7')}</Button>
                  <Button size="sm" variant="warning" onClick={() => send('MULLIGAN')}>
                    {t('game.mulligan')}
                  </Button>
                  <Button size="sm" variant="outline-danger"
                          onClick={() => send('ADJUST_LIFE', { count: -1 })}>
                    −1 ♥
                  </Button>
                  <Button size="sm" variant="outline-success"
                          onClick={() => send('ADJUST_LIFE', { count: 1 })}>
                    +1 ♥
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => send('END_TURN')}>
                    {t('game.endTurn')}
                  </Button>
                </Stack>
                <GameBoard
                  player={me}
                  isActive={current?.activePlayerId === me.playerId}
                  onPlayCard={(id) => send('PLAY_CARD', { cardInstanceId: id })}
                  onTapCard={(id) => send('TAP', { cardInstanceId: id })}
                />
              </>
            ) : (
              <Alert variant="info">{t('game.spectating')}</Alert>
            )}
          </Col>

          <Col lg={4}>
            <h6 className="text-muted">{t('game.opponents')}</h6>
            {opponents.length === 0 && (
              <p className="text-muted small">{t('game.solitaire')}</p>
            )}
            {opponents.map((p) => (
              <GameBoard
                key={p.playerId}
                player={p}
                isActive={current?.activePlayerId === p.playerId}
                onPlayCard={() => undefined}
                onTapCard={() => undefined}
              />
            ))}

            <h6 className="text-muted mt-3">{t('game.chat')}</h6>
            <GameChat
              messages={current?.chat ?? []}
              myId={myPlayerId}
              onSend={(text) => connection?.sendChat(text)}
            />
          </Col>
        </Row>
      </div>
    </DndProvider>
  );
};

export const GameSimulatorPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { current, error, closedReason } = useAppSelector((s) => s.game);
  const myPlayerId = useAppSelector((s) => s.auth.userId);
  const [connection, setConnection] = useState<GameConnection | null>(null);
  const connRef = useRef<GameConnection | null>(null);

  // Take the seat over REST first, then open the socket: `join` on the socket only subscribes,
  // and the server refuses it for anyone who is not already in the room.
  useEffect(() => {
    if (!roomId) return;
    let active = true;

    dispatch(joinRoom({ roomId })).then((result) => {
      if (!active || !joinRoom.fulfilled.match(result)) return;
      const conn = connectToGame(roomId, {
        onState: (state) => dispatch(setGameState(state)),
        onError: (message) => dispatch(setGameError(message)),
        onClosed: (message) => dispatch(setRoomClosed(message)),
      });
      connRef.current = conn;
      setConnection(conn);
    });

    return () => {
      active = false;
      connRef.current?.disconnect();
      connRef.current = null;
      setConnection(null);
      dispatch(clearGame());
    };
  }, [dispatch, roomId]);

  if (!roomId) {
    return <NewGameScreen />;
  }

  if (closedReason) {
    return (
      <div className="container py-4">
        <Alert variant="secondary">
          {closedReason}
          <div className="mt-2">
            <Button size="sm" onClick={() => navigate('/play')}>{t('game.backToPlay')}</Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="container py-4">
        {error
          ? <Alert variant="warning">{error}</Alert>
          : <Alert variant="info">{t('game.connecting')}</Alert>}
      </div>
    );
  }

  return current.status === 'LOBBY'
    ? <GameLobby state={current} myId={myPlayerId} connection={connection}
                 onExit={() => navigate('/play')} />
    : <GameTable connection={connection} />;
};
