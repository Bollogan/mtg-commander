import { useLayoutEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import {
  addCardToDraft,
  changeQty,
  removeCardFromDraft,
  setCardCategory,
  type DeckCard,
  type DeckCategory,
  type ScryfallCard,
} from '../../features/deck/deckSlice';
import { CARD_DND_TYPE } from './CardSearch';
import { useCardContextMenu } from './CardContextMenu';
import { ManaCost } from '../ManaCost';
import {
  cardPrice, groupCards, groupPrice, IMAGE_WIDTHS, PRICE_SYMBOL,
  type CardGroup, type GroupBy, type ImageSize, type PriceSource, type SortBy,
} from './deckView';

/** TCG (USD) + Cardmarket (EUR) price line shown under each card. */
const CardPrices = ({ card }: { card: DeckCard }) => {
  const tcg = cardPrice(card, 'usd', false);
  const cm = cardPrice(card, 'eur', false);
  if (tcg == null && cm == null) return null;
  return (
    <span className="card-prices">
      {tcg != null && <span className="card-prices__item" title="TCGplayer"><span className="card-prices__src">$</span>{tcg.toFixed(2)}</span>}
      {cm != null && <span className="card-prices__item" title="Cardmarket"><span className="card-prices__src">€</span>{cm.toFixed(2)}</span>}
    </span>
  );
};

export const DECK_CARD_DND = 'DECK_CARD';

interface ViewProps {
  cards: DeckCard[];
  groupBy: GroupBy;
  sortBy: SortBy;
  imageSize: ImageSize;
  flagged: Set<string>;
  categories: DeckCategory[];
  readonly?: boolean;
  commanderCard?: DeckCard | null;
  priceSource: PriceSource;
  priceFoil: boolean;
}

/** Small "$12.34" label summarising a section's card prices. */
const SectionPrice = ({ cards, source, foil }: { cards: DeckCard[]; source: PriceSource; foil: boolean }) => {
  const total = groupPrice(cards, source, foil);
  if (total == null) return null;
  return <span className="section-price">{PRICE_SYMBOL[source]}{total.toFixed(2)}</span>;
};

// ─── Shared bits ──────────────────────────────────────────────────────────────

const CardImage = ({ card, width, flagged }: { card: DeckCard; width: number; flagged: boolean }) => {
  const navigate = useNavigate();
  const { openCardMenu, openCardOverlay, interactive } = useCardContextMenu();
  return (
    <div
      className={`deck-thumb${flagged ? ' is-flagged' : ''}${card.foil ? ' is-foil' : ''}`}
      style={{ width }}
      onClick={() => (interactive ? openCardOverlay(card.scryfallId) : navigate(`/card/${card.scryfallId}`))}
      onContextMenu={(e) => openCardMenu(card, e)}
    >
      {card.imageUrl ? (
        <img
          src={card.imageUrl}
          alt={card.name}
          loading="lazy"
          style={{ aspectRatio: '63 / 88', objectFit: 'cover' }}
        />
      ) : (
        <div className="deck-thumb__noimg">{card.name}</div>
      )}
      {card.qty > 1 && <span className="deck-thumb__qty">{card.qty}</span>}
      {card.foil && <span className="deck-thumb__foil" title="Foil">✦</span>}
      {flagged && <span className="deck-thumb__flag" title="Format issue">!</span>}
    </div>
  );
};

const QtyControls = ({ card, readonly }: { card: DeckCard; readonly?: boolean }) => {
  if (readonly) return <span className="deck-qty__n tabular-nums">×{card.qty}</span>;
  const dispatch = useAppDispatch();
  return (
    <span className="deck-qty" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="one less" onClick={() => dispatch(changeQty({ scryfallId: card.scryfallId, delta: -1 }))}>−</button>
      <span className="deck-qty__n tabular-nums">{card.qty}</span>
      <button type="button" aria-label="one more" onClick={() => dispatch(changeQty({ scryfallId: card.scryfallId, delta: 1 }))}>+</button>
      <button type="button" aria-label="remove" className="deck-qty__x" onClick={() => dispatch(removeCardFromDraft(card.scryfallId))}>×</button>
    </span>
  );
};

/** A draggable card (for moving between category columns in Stacks). */
const DraggableCard = ({
  card,
  children,
  className,
  readonly,
}: {
  card: DeckCard;
  children: React.ReactNode;
  className?: string;
  readonly?: boolean;
}) => {
  if (readonly) return <div className={className}>{children}</div>;
  const [{ isDragging }, dragRef] = useDrag(
    () => ({ type: DECK_CARD_DND, item: { scryfallId: card.scryfallId }, collect: (m) => ({ isDragging: m.isDragging() }) }),
    [card.scryfallId],
  );
  return (
    <div
      ref={dragRef as unknown as React.Ref<HTMLDivElement>}
      className={className}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
    >
      {children}
    </div>
  );
};

// ─── Stacks view (compact name+cost rows that expand to the full card on hover) ──

/**
 * One card in a stack: the full card image, overlapped with its siblings so only the
 * printed name strip peeks out. Hovering reveals the whole card (pushing the cards below
 * it down) and shows the quantity controls; each card's TCG/Cardmarket price sits under it.
 */
const StackCardRow = ({ card, width, flagged, readonly }: { card: DeckCard; width: number; flagged: boolean; readonly?: boolean }) => (
  <DraggableCard card={card} className="stack-card" readonly={readonly}>
    <CardImage card={card} width={width} flagged={flagged} />
    <div className="stack-card__controls"><QtyControls card={card} readonly={readonly} /></div>
    <CardPrices card={card} />
  </DraggableCard>
);

const StackColumn = ({ group, groupBy, imageSize, flagged, readonly, priceSource, priceFoil }: { group: CardGroup } & Omit<ViewProps, 'cards' | 'sortBy' | 'categories'>) => {
  const dispatch = useAppDispatch();
  const canRecategorize = !readonly && groupBy === 'category';

  const [{ isOver }, dropRef] = useDrop<ScryfallCard | { scryfallId: string }, void, { isOver: boolean }>(
    () => ({
      accept: [CARD_DND_TYPE, DECK_CARD_DND],
      canDrop: (_item, monitor) => canRecategorize || monitor.getItemType() === CARD_DND_TYPE,
      drop: (item, monitor) => {
        if (monitor.getItemType() === CARD_DND_TYPE) {
          const card = item as ScryfallCard;
          dispatch(addCardToDraft(card));
          if (canRecategorize) dispatch(setCardCategory({ scryfallId: card.id, category: group.key }));
        } else if (canRecategorize) {
          dispatch(setCardCategory({ scryfallId: (item as { scryfallId: string }).scryfallId, category: group.key }));
        }
      },
      collect: (m) => ({ isOver: m.isOver() && m.canDrop() }),
    }),
    [group.key, canRecategorize],
  );

  const width = IMAGE_WIDTHS[imageSize];

  return (
    <div ref={dropRef as unknown as React.Ref<HTMLDivElement>} className={`stack-col${isOver ? ' is-over' : ''}`}>
      <div className="stack-col__head">
        <span className="stack-col__name">{group.key}</span>
        <SectionPrice cards={group.cards} source={priceSource} foil={priceFoil} />
        <span className="stack-col__count tabular-nums">{group.count}</span>
      </div>
      <div className="stack-col__cards" style={{ width: width + 24, ['--card-w' as string]: `${width}px` } as React.CSSProperties}>
        {group.cards.map((card) => (
          <StackCardRow key={card.scryfallId} card={card} width={width} flagged={flagged.has(card.name)} readonly={readonly} />
        ))}
      </div>
    </div>
  );
};

const GAP = 16; // matches the 1rem gap between columns/blocks in CSS

export const StacksView = ({ cards, groupBy, sortBy, imageSize, flagged, categories, readonly, commanderCard, priceSource, priceFoil }: ViewProps) => {
  const groups = groupCards(cards, groupBy, sortBy, categories, commanderCard);
  const width = IMAGE_WIDTHS[imageSize];
  const colWidth = width + 24; // stack-col__cards width

  // Track the available width so the number of columns adapts to the viewport.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colCount = Math.max(1, Math.floor((containerWidth + GAP) / (colWidth + GAP)) || 1);

  // Masonry: place each category (in deck order) into the column that is currently shortest,
  // so a 2nd "row" fills the gaps under the shorter categories instead of aligning to rigid rows.
  // Cards overlap showing only their name strip (~35px), plus the last card shown in full.
  const columns: { items: CardGroup[]; height: number }[] =
    Array.from({ length: colCount }, () => ({ items: [], height: 0 }));
  const cardH = (width * 88) / 63;
  const strip = 35; // visible name strip of an overlapped card
  for (const group of groups) {
    const est = 44 + Math.max(0, group.cards.length - 1) * strip + cardH + GAP;
    let idx = 0;
    for (let i = 1; i < colCount; i++) if (columns[i].height < columns[idx].height) idx = i;
    columns[idx].items.push(group);
    columns[idx].height += est;
  }

  return (
    <div ref={containerRef} className="stacks-view">
      {columns.map((col, i) => (
        <div key={i} className="stack-column" style={{ width: colWidth }}>
          {col.items.map((group) => (
            <StackColumn key={group.key} group={group} groupBy={groupBy} imageSize={imageSize} flagged={flagged} readonly={readonly} priceSource={priceSource} priceFoil={priceFoil} />
          ))}
        </div>
      ))}
    </div>
  );
};

// ─── Grid view (grouped image grid) ─────────────────────────────────────────────

export const GridView = ({ cards, groupBy, sortBy, imageSize, flagged, categories, readonly, commanderCard, priceSource, priceFoil }: ViewProps) => {
  const groups = groupCards(cards, groupBy, sortBy, categories, commanderCard);
  const width = IMAGE_WIDTHS[imageSize];
  return (
    <div className="grid-view">
      {groups.map((group) => (
        <section key={group.key} className="grid-group">
          <h3 className="group-head"><span>{group.key}</span><SectionPrice cards={group.cards} source={priceSource} foil={priceFoil} /><span className="group-head__count tabular-nums">{group.count}</span></h3>
          <div className="grid-group__cards" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${width}px, 1fr))` }}>
            {group.cards.map((card) => (
              <div key={card.scryfallId} className="grid-card">
                <CardImage card={card} width={width} flagged={flagged.has(card.name)} />
                <div className="grid-card__controls"><QtyControls card={card} readonly={readonly} /></div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

// ─── Text view (compact grouped list) ──────────────────────────────────────────

export const TextView = ({ cards, groupBy, sortBy, flagged, categories, readonly, commanderCard, priceSource, priceFoil }: ViewProps) => {
  const groups = groupCards(cards, groupBy, sortBy, categories, commanderCard);
  const { openCardMenu } = useCardContextMenu();
  return (
    <div className="text-view">
      {groups.map((group) => (
        <section key={group.key} className="text-group">
          <h3 className="group-head"><span>{group.key}</span><SectionPrice cards={group.cards} source={priceSource} foil={priceFoil} /><span className="group-head__count tabular-nums">{group.count}</span></h3>
          <ul className="text-list">
            {group.cards.map((card) => (
              <li key={card.scryfallId} className={`text-row${flagged.has(card.name) ? ' is-flagged' : ''}${card.foil ? ' is-foil' : ''}`} onContextMenu={(e) => openCardMenu(card, e)}>
                <QtyControls card={card} readonly={readonly} />
                <span className="text-row__name">{card.name}</span>
                {card.manaCost && <span className="text-row__cost"><ManaCost manaCost={card.manaCost} size={14} /></span>}
                {card.imageUrl && <img className="text-row__preview" src={card.imageUrl} alt="" aria-hidden="true" />}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

// ─── Table view (flat, sorted) ──────────────────────────────────────────────────

export const TableView = ({ cards, groupBy, sortBy, flagged, categories, readonly, commanderCard }: ViewProps) => {
  // Table shows a single flat list (grouped only as a leading section label).
  const groups = groupCards(cards, groupBy, sortBy, categories, commanderCard);
  const rows = groups.flatMap((g) => g.cards.map((c) => ({ card: c, group: g.key })));
  return (
    <div className="table-view table-responsive">
      <table className="table table-sm align-middle deck-table">
        <thead>
          <tr>
            <th style={{ width: 70 }}>Qty</th>
            <th>Name</th>
            <th>Group</th>
            <th>Type</th>
            <th className="text-end">CMC</th>
            <th>Rarity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ card, group }) => (
            <tr key={card.scryfallId} className={flagged.has(card.name) ? 'table-warning-soft' : ''}>
              <td><QtyControls card={card} readonly={readonly} /></td>
              <td className="deck-table__name">
                {card.name}
                {card.imageUrl && <img className="text-row__preview" src={card.imageUrl} alt="" aria-hidden="true" />}
              </td>
              <td className="text-muted small">{group}</td>
              <td className="text-muted small text-truncate" style={{ maxWidth: 220 }}>{card.typeLine}</td>
              <td className="text-end tabular-nums">{card.cmc}</td>
              <td className="text-muted small text-capitalize">{card.rarity ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
