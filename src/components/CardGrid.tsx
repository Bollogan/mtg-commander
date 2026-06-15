import { Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { type Card } from '../types/cardType';

type CardGridItem = Card & { deckCount?: number };

interface CardGridProps {
  cards: CardGridItem[];
  loading?: boolean;
  emptyMessage?: string;
}

export const CardGrid = ({ cards, loading = false, emptyMessage }: CardGridProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const formatUsd = (value?: string) => (value ? `$${value}` : '—');
  const formatEur = (value?: string) => (value ? `€${value}` : '—');
  const formatDeckCount = (count?: number) => {
    if (count === undefined || count === null || count <= 0) {
      return null;
    }
    return t('search.decksCount', { count });
  };

  if (loading) {
    return <p className="text-center text-muted mt-4">{t('search.loading')}</p>;
  }

  if (!cards.length) {
    return <p className="text-center text-muted mt-4">{emptyMessage || t('search.empty')}</p>;
  }

  return (
    <Row className="g-4 mt-2">
      {cards.map((card, index) => (
        <Col key={card.id} xs={12} sm={6} md={4} lg={3}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <div className="card-shell h-100">
              <div className="card-frame">
                {(() => {
                  const imageSrc = card.image_uris?.normal
                    ?? (card.id ? `https://api.scryfall.com/cards/${card.id}?format=image` : '');

                  if (!imageSrc) {
                    return <div className="no-image">No image</div>;
                  }

                  return (
                    <img
                      src={imageSrc}
                      alt={card.name}
                      className="card-image"
                      onClick={() => navigate(`/card/${card.id}`)}
                      loading="lazy"
                    />
                  );
                })()}
              </div>
              <div className="card-meta">
                <div className="card-name">{card.name}</div>
                <div className="card-type">{card.type_line}</div>
                {formatDeckCount(card.deckCount) && (
                  <div className="deck-count">{formatDeckCount(card.deckCount)}</div>
                )}
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
          </motion.div>
        </Col>
      ))}
    </Row>
  );
};