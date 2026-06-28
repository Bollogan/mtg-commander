import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FlipCard } from './FlipCard';
import { type Card } from '../types/cardType';

const formatUsd = (value?: string) => (value ? `$${value}` : '-.-');
const formatEur = (value?: string) => (value ? `€${value}` : '-.-');

/** A single card tile: flippable art + name/type/deck-count/prices. Shared by all grids. */
export const CardTile = ({ card }: { card: Card & { deckCount?: number } }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const deckCount = card.deckCount && card.deckCount > 0
    ? t('search.decksCount', { count: card.deckCount })
    : null;

  return (
    <div className="card-shell h-100">
      <div className="card-frame">
        <FlipCard card={card} onImageClick={() => navigate(`/card/${card.id}`)} />
      </div>
      <div className="card-meta">
        <div className="card-name">{card.name}</div>
        <div className="card-type">{card.type_line}</div>
        {deckCount && <div className="deck-count">{deckCount}</div>}
        <div className="card-prices">
          <div className="price-item">
            <span className="price-label">TCGplayer</span>
            <span className="price-value">{formatUsd(card.prices?.usd)}</span>
          </div>
          <div className="price-item">
            <span className="price-label">Cardmarket</span>
            <span className="price-value">{formatEur(card.prices?.eur)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
