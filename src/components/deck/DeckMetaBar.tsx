import { useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  likeDeck, setPriceFoil, setPriceSource, unlikeDeck, type DeckVisibility,
} from '../../features/deck/deckSlice';
import { cardPrice, groupPrice, PRICE_SYMBOL } from './deckView';

interface DeckMetaBarProps {
  deckId: string | null;
  visibility: DeckVisibility;
  isOwner: boolean;
}

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

/** #1 views · #2 likes (public only) · #3 price total with source/foil selector. */
export const DeckMetaBar = ({ deckId, visibility, isOwner }: DeckMetaBarProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.deck.current);
  const cards = useAppSelector((s) => s.deck.draft.cards);
  const source = useAppSelector((s) => s.deck.priceSource);
  const foil = useAppSelector((s) => s.deck.priceFoil);
  const [liking, setLiking] = useState(false);

  const total = useMemo(() => groupPrice(cards, source, foil), [cards, source, foil]);
  const missing = useMemo(
    () => cards.reduce((n, c) => n + (cardPrice(c, source, foil) == null ? c.qty : 0), 0),
    [cards, source, foil],
  );

  if (!deckId) return null;

  const isPublic = visibility === 'PUBLIC';
  const symbol = PRICE_SYMBOL[source];
  const sourceLabel = source === 'usd' ? 'TCGplayer' : 'Cardmarket';

  const toggleLike = async () => {
    if (!current) return;
    setLiking(true);
    try {
      await dispatch(current.liked ? unlikeDeck(deckId) : likeDeck(deckId));
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className="deck-meta-bar">
      <span className="deck-meta-bar__stat" title={t('builder.views', 'Views')}>
        <EyeIcon /> {current?.views ?? 0}
        <span className="deck-meta-bar__label">{t('builder.views', 'Views')}</span>
      </span>

      {isPublic && (
        isOwner ? (
          <span className="deck-meta-bar__stat" title={t('builder.likes', 'Likes')}>
            <HeartIcon filled /> {current?.likes ?? 0}
            <span className="deck-meta-bar__label">{t('builder.likes', 'Likes')}</span>
          </span>
        ) : (
          <Button
            size="sm"
            variant={current?.liked ? 'danger' : 'outline-danger'}
            onClick={toggleLike}
            disabled={liking || !current}
            className="deck-meta-bar__like"
          >
            <HeartIcon filled={current?.liked} /> {current?.likes ?? 0}
          </Button>
        )
      )}

      <span className="deck-meta-bar__price">
        <span className="deck-meta-bar__total">{total != null ? `${symbol}${total.toFixed(2)}` : '—'}</span>
        <div className="btn-group btn-group-sm" role="group">
          <Button variant={source === 'usd' ? 'primary' : 'outline-secondary'} onClick={() => dispatch(setPriceSource('usd'))}>USD</Button>
          <Button variant={source === 'eur' ? 'primary' : 'outline-secondary'} onClick={() => dispatch(setPriceSource('eur'))}>EUR</Button>
        </div>
        <Button
          size="sm"
          variant={foil ? 'warning' : 'outline-secondary'}
          onClick={() => dispatch(setPriceFoil(!foil))}
          title={t('builder.foil', 'Foil')}
        >
          ✦ {t('builder.foil', 'Foil')}
        </Button>
        <span className="deck-meta-bar__source text-muted">{sourceLabel}</span>
        {missing > 0 && (
          <span className="deck-meta-bar__missing text-muted">
            {t('builder.missingPrice', '{{count}} without price', { count: missing })}
          </span>
        )}
      </span>
    </div>
  );
};
