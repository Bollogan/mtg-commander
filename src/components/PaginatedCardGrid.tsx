import { useState } from 'react';
import { Button, Col, Row, Stack } from 'react-bootstrap';
import { CardTile } from './CardTile';
import { type Card } from '../types/cardType';

interface PaginatedCardGridProps {
  cards: Card[];
  /** Cards per page. Default 12 → 2 rows of 6 on desktop. */
  pageSize?: number;
}

/**
 * A self-paginated card grid: 6 columns on desktop (2 rows × 6 per page) with prev/next
 * controls. Used for the recommendation "apartados".
 */
export const PaginatedCardGrid = ({ cards, pageSize = 12 }: PaginatedCardGridProps) => {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(cards.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = cards.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div>
      <Row className="g-3">
        {slice.map((card) => (
          <Col key={card.id} xs={6} sm={4} md={3} lg={2}>
            <CardTile card={card} />
          </Col>
        ))}
      </Row>
      {pages > 1 && (
        <Stack direction="horizontal" gap={2} className="justify-content-center align-items-center mt-3">
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label="Página anterior"
          >
            ‹
          </Button>
          <span className="text-muted small">{current + 1} / {pages}</span>
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
            aria-label="Página siguiente"
          >
            ›
          </Button>
        </Stack>
      )}
    </div>
  );
};
