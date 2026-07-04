import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { rulesFor, canBeCommander } from '../../data/formats';
import { cardPrice } from './deckView';
import { ManaCost } from '../ManaCost';
import {
  addCategory,
  changeQty,
  fetchPrintings,
  removeCardFromDraft,
  setCardCategory,
  setCardFoil,
  setCardPrinting,
  setCardQty,
  setDraftMeta,
  type DeckCard,
  type ScryfallCard,
} from '../../features/deck/deckSlice';

interface MenuState {
  card: DeckCard;
  x: number;
  y: number;
}

interface CardContextMenuValue {
  /** Whether an interactive builder provider is mounted (so card clicks open the overlay). */
  interactive: boolean;
  /** Opens the card context menu at the pointer, unless the deck is read-only. */
  openCardMenu: (card: DeckCard, e: React.MouseEvent) => void;
  /** Opens the Archidekt-style card overlay for a deck card. */
  openCardOverlay: (scryfallId: string) => void;
}

const noop: CardContextMenuValue = {
  interactive: false,
  openCardMenu: () => undefined,
  openCardOverlay: () => undefined,
};
const Ctx = createContext<CardContextMenuValue>(noop);

/** Right-click / click handlers for card tiles (safe no-op when no provider is mounted). */
export const useCardContextMenu = () => useContext(Ctx);

// ─── Printing picker modal ──────────────────────────────────────────────────────

const PrintingModal = ({ card, onHide, onChosen }: { card: DeckCard; onHide: () => void; onChosen?: (newId: string) => void }) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [printings, setPrintings] = useState<ScryfallCard[] | null>(null);

  useEffect(() => {
    let alive = true;
    setPrintings(null);
    dispatch(fetchPrintings(card.name))
      .unwrap()
      .then((list) => { if (alive) setPrintings(list); })
      .catch(() => { if (alive) setPrintings([]); });
    return () => { alive = false; };
  }, [dispatch, card.name]);

  const choose = (p: ScryfallCard) => {
    dispatch(setCardPrinting({ scryfallId: card.scryfallId, printing: p }));
    onChosen?.(p.id);
    onHide();
  };

  return (
    <Modal show onHide={onHide} centered size="lg" contentClassName="printing-modal">
      <Modal.Header closeButton>
        <Modal.Title className="h6 mb-0">{t('ctx.choosePrinting', 'Choose printing')} — {card.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {printings === null ? (
          <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
        ) : printings.length === 0 ? (
          <p className="text-muted mb-0">{t('ctx.noPrintings', 'No printings found.')}</p>
        ) : (
          <div className="printing-grid">
            {printings.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`printing-cell${p.id === card.scryfallId ? ' is-current' : ''}`}
                onClick={() => choose(p)}
                title={p.setName}
              >
                {p.imageUris?.normal || p.imageUris?.small ? (
                  <img src={p.imageUris.normal ?? p.imageUris.small ?? ''} alt={p.setName} loading="lazy" />
                ) : (
                  <div className="printing-cell__noimg">{p.setName}</div>
                )}
                <span className="printing-cell__set">{p.setName}</span>
                {(p.prices?.usd != null || p.prices?.eur != null) && (
                  <span className="printing-cell__price">
                    {p.prices?.usd != null && `$${p.prices.usd.toFixed(2)}`}
                    {p.prices?.usd != null && p.prices?.eur != null && ' · '}
                    {p.prices?.eur != null && `€${p.prices.eur.toFixed(2)}`}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

// ─── Floating menu ───────────────────────────────────────────────────────────────

const Menu = ({ state, close, onPrinting }: { state: MenuState; close: () => void; onPrinting: () => void }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const categories = useAppSelector((s) => s.deck.draft.categories);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: state.x, y: state.y });
  const [showMove, setShowMove] = useState(false);
  const { card } = state;

  // Clamp inside the viewport once the menu size is known.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const x = Math.min(state.x, window.innerWidth - width - 8);
    const y = Math.min(state.y, window.innerHeight - height - 8);
    setPos({ x: Math.max(8, x), y: Math.max(8, y) });
  }, [state.x, state.y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
    };
  }, [close]);

  const act = (fn: () => void) => () => { fn(); close(); };

  return (
    <div ref={ref} className="card-ctx" style={{ left: pos.x, top: pos.y }} role="menu">
      <div className="card-ctx__title">
        {card.name}
        {card.foil && <span className="card-ctx__foil">FOIL</span>}
      </div>
      <button type="button" className="card-ctx__item" onClick={act(() => navigate(`/card/${card.scryfallId}`))}>
        {t('ctx.details', 'View details')}
      </button>
      <div className="card-ctx__sep" />
      <button type="button" className="card-ctx__item" onClick={act(() => dispatch(setCardFoil({ scryfallId: card.scryfallId, foil: !card.foil })))}>
        <span className="card-ctx__check">{card.foil ? '✓' : ''}</span>
        {t('ctx.foil', 'Foil')}
      </button>
      <button type="button" className="card-ctx__item" onClick={() => { onPrinting(); close(); }}>
        {t('ctx.changePrinting', 'Change printing…')}
      </button>
      <div className="card-ctx__move">
        <button type="button" className="card-ctx__item" onClick={() => setShowMove((v) => !v)}>
          {t('ctx.moveTo', 'Move to category')} <span className="card-ctx__caret">▸</span>
        </button>
        {showMove && (
          <div className="card-ctx__submenu">
            <button type="button" className="card-ctx__item" onClick={act(() => dispatch(setCardCategory({ scryfallId: card.scryfallId, category: null })))}>
              {t('ctx.autoCategory', 'Auto')}
            </button>
            {categories.map((c) => (
              <button
                type="button"
                key={c.name}
                className={`card-ctx__item${card.category === c.name ? ' is-active' : ''}`}
                onClick={act(() => dispatch(setCardCategory({ scryfallId: card.scryfallId, category: c.name })))}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="card-ctx__sep" />
      <div className="card-ctx__qty">
        <button type="button" aria-label={t('ctx.decrease', 'One less')} onClick={() => dispatch(changeQty({ scryfallId: card.scryfallId, delta: -1 }))}>−</button>
        <span className="tabular-nums">{card.qty}</span>
        <button type="button" aria-label={t('ctx.increase', 'One more')} onClick={() => dispatch(changeQty({ scryfallId: card.scryfallId, delta: 1 }))}>+</button>
      </div>
      <button type="button" className="card-ctx__item card-ctx__item--danger" onClick={act(() => dispatch(removeCardFromDraft(card.scryfallId)))}>
        {t('ctx.remove', 'Remove from deck')}
      </button>
    </div>
  );
};

// ─── Archidekt-style card overlay ────────────────────────────────────────────────

/** A single price chip (source symbol + amount), rendered only when a price exists. */
const PriceChip = ({ symbol, value, label }: { symbol: string; value: number | null; label: string }) => {
  if (value == null) return null;
  return (
    <span className="card-overlay__price" title={label}>
      <span className="card-overlay__price-src">{symbol}</span>
      {value.toFixed(2)}
    </span>
  );
};

const CardOverlay = ({
  scryfallId,
  readonly,
  navigateTo,
  onPrinting,
  close,
}: {
  scryfallId: string;
  readonly?: boolean;
  navigateTo: (id: string) => void;
  onPrinting: (card: DeckCard) => void;
  close: () => void;
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const cards = useAppSelector((s) => s.deck.draft.cards);
  const categories = useAppSelector((s) => s.deck.draft.categories);
  const format = useAppSelector((s) => s.deck.draft.format);
  const commanderName = useAppSelector((s) => s.deck.draft.commanderName);
  const [newCat, setNewCat] = useState('');

  const index = cards.findIndex((c) => c.scryfallId === scryfallId);
  const card = index >= 0 ? cards[index] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft' && index > 0) navigateTo(cards[index - 1].scryfallId);
      else if (e.key === 'ArrowRight' && index < cards.length - 1) navigateTo(cards[index + 1].scryfallId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, cards, navigateTo, close]);

  if (!card) return null;

  const isCommanderFormat = rulesFor(format).requiresCommander;
  const isCommander = commanderName.toLowerCase() === card.name.toLowerCase();
  const commanderEligible = canBeCommander(card.typeLine, card.oracleText);
  const prev = index > 0 ? cards[index - 1] : null;
  const next = index < cards.length - 1 ? cards[index + 1] : null;

  const addAndAssignCategory = () => {
    const name = newCat.trim();
    if (!name) return;
    dispatch(addCategory({ name, color: null, icon: null, order: categories.length }));
    dispatch(setCardCategory({ scryfallId: card.scryfallId, category: name }));
    setNewCat('');
  };

  return (
    <div className="card-overlay" role="dialog" aria-modal="true" onMouseDown={close}>
      <div className="card-overlay__panel" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="card-overlay__close" onClick={close} aria-label={t('common.close', 'Close')}>✕</button>

        <div className="card-overlay__media">
          <div className={`card-overlay__img${card.foil ? ' is-foil' : ''}`}>
            {card.imageUrl
              ? <img src={card.imageUrl} alt={card.name} />
              : <div className="deck-thumb__noimg">{card.name}</div>}
          </div>
          <div className="card-overlay__prices">
            <PriceChip symbol="$" value={cardPrice(card, 'usd', false)} label="TCGplayer" />
            <PriceChip symbol="€" value={cardPrice(card, 'eur', false)} label="Cardmarket" />
          </div>
        </div>

        <div className="card-overlay__body">
          <div className="card-overlay__title">
            <h3>{card.name}</h3>
            {card.manaCost && <ManaCost manaCost={card.manaCost} size={18} />}
          </div>
          {card.typeLine && <div className="card-overlay__type text-muted">{card.typeLine}</div>}
          {card.oracleText && <p className="card-overlay__oracle">{card.oracleText}</p>}

          {!readonly && (
            <>
              <div className="card-overlay__section">
                <span className="card-overlay__label">{t('ctx.quantity', 'Quantity')}</span>
                <span className="card-ctx__qty card-overlay__qty">
                  <button type="button" aria-label={t('ctx.decrease', 'One less')} onClick={() => dispatch(changeQty({ scryfallId: card.scryfallId, delta: -1 }))}>−</button>
                  <input
                    type="number"
                    min={1}
                    value={card.qty}
                    onChange={(e) => dispatch(setCardQty({ scryfallId: card.scryfallId, qty: Math.max(1, Number(e.target.value) || 1) }))}
                  />
                  <button type="button" aria-label={t('ctx.increase', 'One more')} onClick={() => dispatch(changeQty({ scryfallId: card.scryfallId, delta: 1 }))}>+</button>
                </span>
                {isCommanderFormat && !isCommander && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={!commanderEligible}
                    title={commanderEligible ? undefined : t('ctx.cannotBeCommander', "This card can't be a commander")}
                    onClick={() => dispatch(setDraftMeta({ commanderName: card.name }))}
                  >
                    👑 {t('ctx.setCommander', 'Set Commander')}
                  </button>
                )}
              </div>

              <div className="card-overlay__section">
                <span className="card-overlay__label">{t('ctx.printing', 'Printing')}</span>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onPrinting(card)}>
                  {t('ctx.changePrinting', 'Change printing…')}
                </button>
                <button type="button" className={`btn btn-sm ${card.foil ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => dispatch(setCardFoil({ scryfallId: card.scryfallId, foil: !card.foil }))}>
                  {t('ctx.foil', 'Foil')}
                </button>
              </div>

              <div className="card-overlay__section card-overlay__section--col">
                <span className="card-overlay__label">{t('ctx.categories', 'Categories')}</span>
                <select
                  className="form-select form-select-sm"
                  value={card.category ?? ''}
                  onChange={(e) => dispatch(setCardCategory({ scryfallId: card.scryfallId, category: e.target.value || null }))}
                >
                  <option value="">{t('ctx.autoCategory', 'Auto')}</option>
                  {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <div className="card-overlay__addcat">
                  <input className="form-control form-control-sm" placeholder={t('ctx.newCategory', 'New category')} value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAndAssignCategory()} />
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={addAndAssignCategory}>+</button>
                </div>
              </div>
            </>
          )}

          <div className="card-overlay__actions">
            <button type="button" className="btn btn-sm btn-outline-info" onClick={() => navigate(`/card/${card.scryfallId}`)}>
              {t('ctx.details', 'View details')}
            </button>
            {!readonly && (
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { dispatch(removeCardFromDraft(card.scryfallId)); close(); }}>
                {t('ctx.remove', 'Remove from deck')}
              </button>
            )}
          </div>
        </div>

        <div className="card-overlay__nav">
          <button type="button" disabled={!prev} onClick={() => prev && navigateTo(prev.scryfallId)}>
            ← {prev?.name ?? ''}
          </button>
          <button type="button" disabled={!next} onClick={() => next && navigateTo(next.scryfallId)}>
            {next?.name ?? ''} →
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Provider ────────────────────────────────────────────────────────────────────

export const CardContextMenuProvider = ({ readonly, children }: { readonly?: boolean; children: React.ReactNode }) => {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [overlayId, setOverlayId] = useState<string | null>(null);
  const [printingFor, setPrintingFor] = useState<DeckCard | null>(null);

  const openCardMenu = useCallback((card: DeckCard, e: React.MouseEvent) => {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
    setMenu({ card, x: e.clientX, y: e.clientY });
  }, [readonly]);

  const openCardOverlay = useCallback((scryfallId: string) => setOverlayId(scryfallId), []);

  const value = useMemo(
    () => ({ interactive: true, openCardMenu, openCardOverlay }),
    [openCardMenu, openCardOverlay],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {menu && createPortal(
        <Menu
          state={menu}
          close={() => setMenu(null)}
          onPrinting={() => setPrintingFor(menu.card)}
        />,
        document.body,
      )}
      {overlayId && createPortal(
        <CardOverlay
          scryfallId={overlayId}
          readonly={readonly}
          navigateTo={setOverlayId}
          onPrinting={(card) => setPrintingFor(card)}
          close={() => setOverlayId(null)}
        />,
        document.body,
      )}
      {printingFor && (
        <PrintingModal
          card={printingFor}
          onHide={() => setPrintingFor(null)}
          onChosen={(newId) => { if (overlayId === printingFor.scryfallId) setOverlayId(newId); }}
        />
      )}
    </Ctx.Provider>
  );
};
