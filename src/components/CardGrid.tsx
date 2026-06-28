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
            <CardTile card={card} />
          </motion.div>
        </Col>
      ))}
    </Row>
  );
};
