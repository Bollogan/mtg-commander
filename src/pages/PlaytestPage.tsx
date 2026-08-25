import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Container, Form, Nav, Spinner } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDeck } from '../features/deck/deckSlice';
import {
  newGame,
  playtestReducer,
  randomSeed,
  splitDeck,
  type PlaytestAction,
  type PlaytestState,
  type PlaytestZone,
} from '../features/playtest/playtestEngine';
import { PlaytestCard, type PlaytestCardActions } from '../components/playtest/PlaytestCard';
import { ZoneListModal, type ZoneListRequest } from '../components/playtest/ZoneListModal';
import { DrawOddsPanel } from '../components/playtest/DrawOddsPanel';
import { PlaytestLog } from '../components/playtest/PlaytestLog';

const HISTORY_LIMIT = 50;

/**
 * Solo playtest ("goldfish") for a deck: shuffle, keep or mulligan an opening hand, then step
 * through the first turns to see how the deck actually starts — alongside the exact draw odds
 * for whatever you are hoping to hit.
 *
 * Deliberately not a game of Magic: nothing is enforced, there is no opponent and no server.
 * The multiplayer table lives at /play; this page never touches it.
 */
export const PlaytestPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { current, status } = useAppSelector((s) => s.deck);

  const [game, setGame] = useState<{ deckId: string; state: PlaytestState } | null>(null);
  const [history, setHistory] = useState<PlaytestState[]>([]);
  const [zoneView, setZoneView] = useState<ZoneListRequest | null>(null);
  const [amount, setAmount] = useState(3);
  const [tab, setTab] = useState<'odds' | 'log'>('odds');

  useEffect(() => {
    if (id) dispatch(fetchDeck(id));
  }, [dispatch, id]);

  const start = useCallback((seed: number, onThePlay: boolean) => {
    if (!current) return;
    setGame({ deckId: current.id, state: newGame(current, { seed, onThePlay }) });
    setHistory([]);
    setZoneView(null);
  }, [current]);

  // Deal the first hand as soon as the deck arrives, and re-deal if the user navigates to
  // another deck. Adjusting state during render (rather than in an effect) is React's own
  // recommendation for "reset state when the input changes" and avoids a flash of stale board.
  if (current && current.cards.length > 0 && game?.deckId !== current.id) {
    setGame({ deckId: current.id, state: newGame(current, { seed: randomSeed(), onThePlay: true }) });
    setHistory([]);
  }

  const state = game?.state ?? null;

  // Undo is a plain history stack because the reducer is pure: the previous state *is* the
  // previous board. Bounded so a long game does not pin every earlier board in memory.
  const apply = useCallback((action: PlaytestAction) => {
    if (!game) return;
    const next = playtestReducer(game.state, action);
    if (next === game.state) return;
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), game.state]);
    setGame({ ...game, state: next });
  }, [game]);

  const undo = useCallback(() => {
    const previous = history.at(-1);
    if (!previous || !game) return;
    setGame({ ...game, state: previous });
    setHistory((h) => h.slice(0, -1));
  }, [game, history]);

  const cardActions: PlaytestCardActions = useMemo(() => ({
    move: (uid, to, options) => apply({ type: 'move', uid, to, ...options }),
    toggleTap: (uid) => apply({ type: 'toggleTap', uid }),
    addCounter: (uid, delta) => apply({ type: 'addCounter', uid, delta }),
    toggleFaceDown: (uid) => apply({ type: 'toggleFaceDown', uid }),
  }), [apply]);

  // The population the odds are computed against: the decklist minus the command zone.
  const deckPool = useMemo(
    () => (current ? splitDeck(current).library : []),
    [current],
  );

  if (status === 'loading' && !current) {
    return <Container className="page-container text-center"><Spinner animation="border" /></Container>;
  }

  if (!current) {
    return (
      <Container className="page-container">
        <Alert variant="warning">{t('playtest.deckMissing', 'Deck not found.')}</Alert>
      </Container>
    );
  }

  if (!state) {
    return (
      <Container className="page-container">
        <Alert variant="info">
          {t('playtest.emptyDeck', 'This deck has no cards yet — add some before playtesting.')}
        </Alert>
      </Container>
    );
  }

  const { zones } = state;
  const battlefieldLands = zones.battlefield.filter((c) => c.isLand);
  const battlefieldSpells = zones.battlefield.filter((c) => !c.isLand);
  const untappedLands = battlefieldLands.filter((c) => !c.tapped).length;
  const mustBottom = state.mulligans - state.bottomPicks.length;

  const openZone = (zone: PlaytestZone, title: string, hidden = false, cards = zones[zone]) =>
    setZoneView({ zone, title, cards, hidden });

  return (
    <Container fluid className="page-container pt-page">
      <div className="pt-header">
        <div>
          <h1 className="h5 mb-0">{current.name}</h1>
          <span className="text-muted small">
            {t('playtest.subtitle', 'Solo playtest · no opponent, no rules enforcement')}
          </span>
        </div>

        <div className="pt-header__stats">
          <span className="pt-stat">
            <em>{t('playtest.turn', 'Turn')}</em>
            <strong className="tabular-nums">{state.turn || '—'}</strong>
          </span>
          <span className="pt-stat">
            <em>{t('playtest.life', 'Life')}</em>
            <span className="pt-stat__stepper">
              <button type="button" onClick={() => apply({ type: 'adjustLife', delta: -1 })} aria-label="−">−</button>
              <strong className="tabular-nums">{state.life}</strong>
              <button type="button" onClick={() => apply({ type: 'adjustLife', delta: 1 })} aria-label="+">+</button>
            </span>
          </span>
          <span className="pt-stat">
            <em>{t('playtest.manaAvailable', 'Untapped lands')}</em>
            <strong className="tabular-nums">{untappedLands}</strong>
          </span>
        </div>

        <div className="pt-header__actions">
          <Form.Check
            type="switch"
            id="pt-on-the-play"
            className="me-2"
            label={state.onThePlay ? t('playtest.onThePlay', 'on the play') : t('playtest.onTheDraw', 'on the draw')}
            checked={state.onThePlay}
            title={t('playtest.playDrawHint', 'Switching restarts the game with the same shuffle.')}
            onChange={(e) => start(state.seed, e.target.checked)}
          />
          <Button size="sm" variant="outline-secondary" onClick={() => start(state.seed, state.onThePlay)}>
            {t('playtest.restartSame', 'Same hand')}
          </Button>
          <Button size="sm" variant="primary" onClick={() => start(randomSeed(), state.onThePlay)}>
            {t('playtest.newGame', 'New game')}
          </Button>
          <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/decks/${current.id}`)}>
            {t('playtest.backToDeck', 'Back to deck')}
          </Button>
        </div>
      </div>

      {state.phase === 'mulligan' && (
        <Alert variant="secondary" className="pt-mulligan">
          <div>
            <strong>{t('playtest.openingHand', 'Opening hand')}</strong>{' '}
            {state.mulligans > 0 && (
              <span className="text-muted">
                {mustBottom > 0
                  ? t('playtest.pickBottom', 'Pick {{count}} card(s) to put on the bottom.', { count: mustBottom })
                  : t('playtest.readyToKeep', 'Ready to keep.')}
              </span>
            )}
          </div>
          <div className="d-flex gap-2">
            <Button size="sm" variant="warning" onClick={() => apply({ type: 'mulligan' })}>
              {t('playtest.mulligan', 'Mulligan')} ({state.mulligans + 1})
            </Button>
            <Button size="sm" variant="success" disabled={mustBottom > 0}
              onClick={() => apply({ type: 'keepHand' })}>
              {t('playtest.keepHand', 'Keep this hand')}
            </Button>
          </div>
        </Alert>
      )}

      <div className="pt-layout">
        <div className="pt-board">
          <div className="pt-toolbar">
            <Button size="sm" variant="primary" disabled={state.phase !== 'playing'}
              onClick={() => apply({ type: 'nextTurn' })}>
              {t('playtest.nextTurn', 'Next turn (untap + draw)')}
            </Button>
            <Button size="sm" variant="outline-primary" onClick={() => apply({ type: 'draw', count: 1 })}>
              {t('playtest.draw', 'Draw')}
            </Button>
            <span className="pt-toolbar__group">
              <Form.Control
                size="sm" type="number" min={1} max={99} value={amount}
                aria-label={t('playtest.amount', 'Amount')}
                onChange={(e) => setAmount(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
              />
              <Button size="sm" variant="outline-secondary" onClick={() => apply({ type: 'draw', count: amount })}>
                {t('playtest.drawX', 'Draw X')}
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={() => apply({ type: 'mill', count: amount })}>
                {t('playtest.millX', 'Mill X')}
              </Button>
              <Button
                size="sm" variant="outline-secondary"
                onClick={() => openZone('library', t('playtest.peekTitle', 'Top of library'), true,
                  zones.library.slice(0, amount))}
              >
                {t('playtest.peekX', 'Peek X')}
              </Button>
            </span>
            <Button size="sm" variant="outline-secondary" onClick={() => apply({ type: 'untapAll' })}>
              {t('playtest.untapAll', 'Untap all')}
            </Button>
            <Button size="sm" variant="outline-secondary" onClick={() => apply({ type: 'shuffleLibrary' })}>
              {t('playtest.shuffle', 'Shuffle')}
            </Button>
            <Button size="sm" variant="outline-secondary" disabled={history.length === 0} onClick={undo}>
              {t('playtest.undo', 'Undo')}
            </Button>
          </div>

          <section className="pt-zone">
            <h2 className="pt-zone__title">
              {t('playtest.battlefield', 'Battlefield')}
              <span className="text-muted"> · {zones.battlefield.length}</span>
            </h2>
            {zones.battlefield.length === 0 ? (
              <p className="text-muted small mb-0">{t('playtest.emptyBattlefield', 'Nothing in play yet.')}</p>
            ) : (
              <>
                {battlefieldSpells.length > 0 && (
                  <div className="pt-row">
                    {battlefieldSpells.map((c) => (
                      <PlaytestCard key={c.uid} card={c} zone="battlefield" actions={cardActions} />
                    ))}
                  </div>
                )}
                {battlefieldLands.length > 0 && (
                  <div className="pt-row pt-row--lands">
                    {battlefieldLands.map((c) => (
                      <PlaytestCard key={c.uid} card={c} zone="battlefield" actions={cardActions} size="sm" />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {zones.command.length > 0 && (
            <section className="pt-zone">
              <h2 className="pt-zone__title">{t('playtest.zone.command', 'Command zone')}</h2>
              <div className="pt-row">
                {zones.command.map((c) => (
                  <PlaytestCard key={c.uid} card={c} zone="command" actions={cardActions} size="sm" />
                ))}
              </div>
            </section>
          )}

          <section className="pt-zone">
            <h2 className="pt-zone__title">
              {t('playtest.hand', 'Hand')}
              <span className="text-muted"> · {zones.hand.length}</span>
            </h2>
            <div className="pt-row pt-row--hand">
              {zones.hand.map((c) => (
                <PlaytestCard
                  key={c.uid}
                  card={c}
                  zone="hand"
                  actions={cardActions}
                  selectable={state.phase === 'mulligan' && state.mulligans > 0}
                  selected={state.bottomPicks.includes(c.uid)}
                  onSelect={(uid) => apply({ type: 'toggleBottomPick', uid })}
                />
              ))}
            </div>
          </section>

          <div className="pt-zonebar">
            <button type="button" className="pt-zonebar__chip"
              onClick={() => openZone('library', t('playtest.searchLibrary', 'Search library'), true)}>
              {t('playtest.zone.library', 'Library')} <strong>{zones.library.length}</strong>
            </button>
            <button type="button" className="pt-zonebar__chip"
              onClick={() => openZone('graveyard', t('playtest.zone.graveyard', 'Graveyard'))}>
              {t('playtest.zone.graveyard', 'Graveyard')} <strong>{zones.graveyard.length}</strong>
            </button>
            <button type="button" className="pt-zonebar__chip"
              onClick={() => openZone('exile', t('playtest.zone.exile', 'Exile'))}>
              {t('playtest.zone.exile', 'Exile')} <strong>{zones.exile.length}</strong>
            </button>
          </div>
        </div>

        <aside className="pt-side">
          <Nav variant="tabs" activeKey={tab} onSelect={(k) => setTab(k === 'log' ? 'log' : 'odds')}>
            <Nav.Item>
              <Nav.Link eventKey="odds">{t('playtest.drawOdds', 'Draw odds')}</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="log">{t('playtest.log.title', 'Log')}</Nav.Link>
            </Nav.Item>
          </Nav>
          <div className="pt-side__body">
            {tab === 'odds' ? (
              <DrawOddsPanel
                deckPool={deckPool}
                handSize={Math.max(1, 7 - state.mulligans)}
                onThePlay={state.onThePlay}
                cardsDrawn={state.cardsDrawn}
                landsDrawn={state.landsDrawn}
              />
            ) : (
              <PlaytestLog entries={state.log} />
            )}
          </div>
        </aside>
      </div>

      <ZoneListModal
        request={zoneView}
        onHide={() => setZoneView(null)}
        onMove={(uid, to, options) => {
          apply({ type: 'move', uid, to, ...options });
          setZoneView(null);
        }}
      />
    </Container>
  );
};
