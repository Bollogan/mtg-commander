import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Form, Stack } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMyDecks } from '../../features/deck/deckSlice';
import type { GameState } from '../../features/game/gameSlice';
import type { GameConnection } from '../../services/gameSocket';
import { GameChat } from './GameChat';

/** The shareable invite: the room code doubles as the id, so the link needs no lookup. */
const inviteLinkFor = (roomId: string) => `${window.location.origin}/join/${roomId}`;

const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard is denied on insecure origins; the value is on screen to copy by hand anyway.
      setCopied(false);
    }
  };

  return (
    <Button size="sm" variant={copied ? 'success' : 'outline-secondary'} onClick={copy}>
      {copied ? t('game.copied') : label}
    </Button>
  );
};

interface LobbyProps {
  state: GameState;
  myId: string | null;
  connection: GameConnection | null;
  /** Called after leaving: the server stops broadcasting to us, so the page must move on. */
  onExit: () => void;
}

/**
 * The pre-game room: who is seated, what they are bringing, who is ready, and the invite. The
 * host is the only one who can start, kick, hand the room over or close it — every one of those
 * goes out over the socket so the whole room updates at once.
 */
export const GameLobby = ({ state, myId, connection, onExit }: LobbyProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const myDecks = useAppSelector((s) => s.deck.myDecks);
  const me = state.players.find((p) => p.playerId === myId);
  const isHost = state.hostId === myId;
  const seated = Boolean(me);
  const everyoneReady = state.players.length > 0 && state.players.every((p) => p.ready);

  useEffect(() => {
    dispatch(fetchMyDecks());
  }, [dispatch]);

  const onLeave = () => {
    connection?.leave();
    onExit();
  };

  const onDeckChange = (deckId: string) => {
    const deck = myDecks.find((d) => d.id === deckId);
    connection?.chooseDeck(deckId || null, deck?.name ?? null);
  };

  return (
    <div className="lobby">
      <div className="lobby__main">
        <div className="page-header">
          <h1>{state.name}</h1>
          <p>{t('game.lobbyLead')}</p>
        </div>

        <section className="settings-card">
          <h2>{t('game.invite')}</h2>
          <p className="settings-lead">{t('game.inviteLead')}</p>
          <Stack direction="horizontal" gap={2} className="flex-wrap mb-2">
            <code className="lobby__code">{state.roomId}</code>
            <CopyButton value={state.roomId} label={t('game.copyCode')} />
            <CopyButton value={inviteLinkFor(state.roomId)} label={t('game.copyLink')} />
            <Badge bg="secondary" className="ms-auto">
              {state.publicRoom ? t('game.public') : t('game.private')}
            </Badge>
          </Stack>
          <div className="lobby__link">{inviteLinkFor(state.roomId)}</div>
        </section>

        <section className="settings-card">
          <h2>
            {t('game.players')}{' '}
            <span className="section-count">{state.players.length}/{state.maxPlayers}</span>
          </h2>
          <ul className="lobby__seats">
            {state.players.map((p) => (
              <li key={p.playerId} className={`lobby__seat${p.ready ? ' is-ready' : ''}`}>
                <span className={`lobby__dot${p.connected ? ' is-online' : ''}`} aria-hidden="true" />
                <span className="lobby__name">{p.playerName}</span>
                {state.hostId === p.playerId && (
                  <Badge bg="warning" text="dark">{t('game.host')}</Badge>
                )}
                <span className="lobby__deck">{p.deckName ?? t('game.noDeck')}</span>
                <Badge bg={p.ready ? 'success' : 'secondary'} className="ms-auto">
                  {p.ready ? t('game.ready') : t('game.notReady')}
                </Badge>
                {isHost && p.playerId !== myId && (
                  <>
                    <Button size="sm" variant="outline-secondary"
                            onClick={() => connection?.transferHost(p.playerId)}>
                      {t('game.makeHost')}
                    </Button>
                    <Button size="sm" variant="outline-danger"
                            onClick={() => connection?.kick(p.playerId)}>
                      {t('game.kick')}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>

          {state.spectators.length > 0 && (
            <p className="text-muted small mb-0">
              {t('game.watching', { names: state.spectators.map((s) => s.userName).join(', ') })}
            </p>
          )}
        </section>

        {seated ? (
          <section className="settings-card">
            <h2>{t('game.yourSeat')}</h2>
            <Form.Label className="small text-muted">{t('game.deck')}</Form.Label>
            <Form.Select
              className="mb-3"
              value={me?.deckId ?? ''}
              onChange={(e) => onDeckChange(e.target.value)}
            >
              <option value="">{t('game.genericDeck')}</option>
              {myDecks.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Form.Select>

            <Stack direction="horizontal" gap={2} className="flex-wrap">
              <Button
                variant={me?.ready ? 'outline-success' : 'success'}
                onClick={() => connection?.setReady(!me?.ready)}
              >
                {me?.ready ? t('game.unready') : t('game.imReady')}
              </Button>
              {isHost && (
                <Button variant="primary" disabled={!everyoneReady}
                        onClick={() => connection?.startGame()}>
                  {t('game.start')}
                </Button>
              )}
              <Button variant="outline-secondary" className="ms-auto" onClick={onLeave}>
                {t('game.leave')}
              </Button>
              {isHost && (
                <Button variant="outline-danger" onClick={() => connection?.closeRoom()}>
                  {t('game.close')}
                </Button>
              )}
            </Stack>
            {isHost && !everyoneReady && (
              <p className="text-muted small mt-2 mb-0">{t('game.waitingReady')}</p>
            )}
          </section>
        ) : (
          <Alert variant="info">{t('game.spectatorNotice')}</Alert>
        )}
      </div>

      <aside className="lobby__side">
        <h2 className="lobby__side-title">{t('game.chat')}</h2>
        <GameChat
          messages={state.chat}
          myId={myId}
          onSend={(text) => connection?.sendChat(text)}
        />
      </aside>
    </div>
  );
};
