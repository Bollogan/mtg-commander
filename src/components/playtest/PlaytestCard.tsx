import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { PlaytestCard as Card, PlaytestZone } from '../../features/playtest/playtestEngine';

export interface PlaytestCardActions {
  move: (uid: string, to: PlaytestZone, options?: { position?: 'top' | 'bottom'; tapped?: boolean }) => void;
  toggleTap: (uid: string) => void;
  addCounter: (uid: string, delta: number) => void;
  toggleFaceDown: (uid: string) => void;
}

interface MenuProps {
  card: Card;
  zone: PlaytestZone;
  x: number;
  y: number;
  actions: PlaytestCardActions;
  onClose: () => void;
}

/**
 * The card action menu, mirroring the playtester "Move to / Card actions" list: every zone is
 * one click away, plus the battlefield-only physical state (tap, counters, face down).
 * Reuses the deck builder's `.card-ctx` styling so both menus look and behave the same.
 */
function PlaytestCardMenu({ card, zone, x, y, actions, onClose }: MenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Clamp inside the viewport once the menu size is known.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  const act = (fn: () => void) => () => { fn(); onClose(); };

  const moveTargets: { zone: PlaytestZone; label: string; position?: 'top' | 'bottom' }[] = [
    { zone: 'hand', label: t('playtest.moveHand', 'Move to hand') },
    { zone: 'graveyard', label: t('playtest.moveGraveyard', 'Move to graveyard') },
    { zone: 'exile', label: t('playtest.moveExile', 'Move to exile') },
    { zone: 'command', label: t('playtest.moveCommand', 'Move to command zone') },
    { zone: 'library', label: t('playtest.moveTop', 'Move to top of library'), position: 'top' },
    { zone: 'library', label: t('playtest.moveBottom', 'Move to bottom of library'), position: 'bottom' },
  ];

  return createPortal(
    <div ref={ref} className="card-ctx" style={{ left: pos.x, top: pos.y }} role="menu">
      <div className="card-ctx__title">{card.name}</div>

      {zone !== 'battlefield' && (
        <>
          <button type="button" className="card-ctx__item"
            onClick={act(() => actions.move(card.uid, 'battlefield'))}>
            {t('playtest.play', 'Play card')}
          </button>
          <button type="button" className="card-ctx__item"
            onClick={act(() => actions.move(card.uid, 'battlefield', { tapped: true }))}>
            {t('playtest.playTapped', 'Play tapped')}
          </button>
          <div className="card-ctx__sep" />
        </>
      )}

      {zone === 'battlefield' && (
        <>
          <button type="button" className="card-ctx__item" onClick={act(() => actions.toggleTap(card.uid))}>
            {card.tapped ? t('playtest.untap', 'Untap') : t('playtest.tap', 'Tap')}
          </button>
          <button type="button" className="card-ctx__item" onClick={act(() => actions.toggleFaceDown(card.uid))}>
            {card.faceDown ? t('playtest.faceUp', 'Turn face up') : t('playtest.faceDown', 'Turn face down')}
          </button>
          <div className="card-ctx__qty">
            <button type="button" onClick={() => actions.addCounter(card.uid, -1)} aria-label="−">−</button>
            <span className="tabular-nums">
              {t('playtest.counters', 'Counters')}: {card.counters}
            </span>
            <button type="button" onClick={() => actions.addCounter(card.uid, 1)} aria-label="+">+</button>
          </div>
          <div className="card-ctx__sep" />
        </>
      )}

      {moveTargets
        .filter((target) => !(target.zone === zone && !target.position))
        .map((target) => (
          <button
            key={`${target.zone}-${target.position ?? ''}`}
            type="button"
            className="card-ctx__item"
            onClick={act(() => actions.move(card.uid, target.zone, { position: target.position }))}
          >
            {target.label}
          </button>
        ))}

      <div className="card-ctx__sep" />
      <button type="button" className="card-ctx__item"
        onClick={act(() => navigate(`/card/${card.scryfallId}`))}>
        {t('ctx.details', 'View details')}
      </button>
    </div>,
    document.body,
  );
}

interface Props {
  card: Card;
  zone: PlaytestZone;
  actions: PlaytestCardActions;
  /** Mulligan phase: clicking picks the card to bottom instead of opening the menu. */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (uid: string) => void;
  size?: 'sm' | 'md';
}

/** A single card in play: click opens its action menu, double-click taps it on the battlefield. */
export function PlaytestCard({
  card, zone, actions, selectable, selected, onSelect, size = 'md',
}: Props) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const open = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectable) {
      onSelect?.(card.uid);
      return;
    }
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const className = [
    'pt-card',
    `pt-card--${size}`,
    card.tapped ? 'is-tapped' : '',
    card.faceDown ? 'is-facedown' : '',
    selected ? 'is-selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={open}
        onContextMenu={open}
        onDoubleClick={() => zone === 'battlefield' && actions.toggleTap(card.uid)}
        title={card.name}
        aria-label={card.name}
      >
        {card.imageUrl && !card.faceDown
          ? <img src={card.imageUrl} alt={card.name} loading="lazy" />
          : (
            <span className="pt-card__noimg">
              {card.faceDown ? t('playtest.faceDownShort', 'Face down') : card.name}
            </span>
          )}
        {card.counters > 0 && <span className="pt-card__counters">+{card.counters}</span>}
      </button>

      {menu && (
        <PlaytestCardMenu
          card={card}
          zone={zone}
          x={menu.x}
          y={menu.y}
          actions={actions}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}
