import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  changeQty,
  fetchPrintings,
  removeCardFromDraft,
  setCardCategory,
  setCardFoil,
  setCardPrinting,
  type DeckCard,
  type ScryfallCard,
} from '../../features/deck/deckSlice';

interface MenuState {
  card: DeckCard;
  x: number;
  y: number;
}

interface CardContextMenuValue {
  /** Opens the card context menu at the pointer, unless the deck is read-only. */
  openCardMenu: (card: DeckCard, e: React.MouseEvent) => void;
}

const noop: CardContextMenuValue = { openCardMenu: () => undefined };
const Ctx = createContext<CardContextMenuValue>(noop);

/** Right-click handler for card tiles/images (safe no-op when no provider is mounted). */
export const useCardContextMenu = () => useContext(Ctx);

// ─── Printing picker modal ──────────────────────────────────────────────────────

const PrintingModal = ({ card, onHide }: { card: DeckCard; onHide: () => void }) => {
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

// ─── Provider ────────────────────────────────────────────────────────────────────

export const CardContextMenuProvider = ({ readonly, children }: { readonly?: boolean; children: React.ReactNode }) => {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [printingFor, setPrintingFor] = useState<DeckCard | null>(null);

  const openCardMenu = useCallback((card: DeckCard, e: React.MouseEvent) => {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
    setMenu({ card, x: e.clientX, y: e.clientY });
  }, [readonly]);

  return (
    <Ctx.Provider value={{ openCardMenu }}>
      {children}
      {menu && createPortal(
        <Menu
          state={menu}
          close={() => setMenu(null)}
          onPrinting={() => setPrintingFor(menu.card)}
        />,
        document.body,
      )}
      {printingFor && <PrintingModal card={printingFor} onHide={() => setPrintingFor(null)} />}
    </Ctx.Provider>
  );
};
