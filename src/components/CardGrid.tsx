import { Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { type Card } from '../types/cardType';
import { CardTile } from './CardTile';

type CardGridItem = Card & { deckCount?: number };

interface CardGridProps {
  cards: CardGridItem[];
  loading?: boolean;
  emptyMessage?: string;
}

export const CardGrid = ({ cards, loading = false, emptyMessage }: CardGridProps) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Row className="g-4 mt-2" aria-busy="true" aria-label={t('search.loading')}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Col key={i} xs={12} sm={6} md={4} lg={3}>
            <div className="card-skeleton" />
          </Col>
        ))}
      </Row>
    );
  }

  if (!cards.length) {
    return (
      <div className="grid-empty">
        <span className="grid-empty__glyph" aria-hidden="true">✦</span>
        <p className="mb-0">{emptyMessage || t('search.empty')}</p>
      </div>
    );
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
            <CardTile card={card} />
          </motion.div>
        </Col>
      ))}
    </Row>
  );
};
