import { useMemo, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { PlaytestCard, PlaytestZone } from '../../features/playtest/playtestEngine';

export interface ZoneListRequest {
  title: string;
  zone: PlaytestZone;
  cards: PlaytestCard[];
  /** True for library views, which must warn that looking is not free in a real game. */
  hidden?: boolean;
}

interface Props {
  request: ZoneListRequest | null;
  onHide: () => void;
  onMove: (uid: string, to: PlaytestZone, options?: { position?: 'top' | 'bottom' }) => void;
}

/**
 * Covers the playtester's "Search library", "Search graveyard" and "Peek top X" views: a
 * filterable list of a hidden zone where each card can be sent anywhere else.
 */
export function ZoneListModal({ request, onHide, onMove }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');

  const cards = useMemo(() => {
    if (!request) return [];
    const needle = filter.trim().toLowerCase();
    if (!needle) return request.cards;
    return request.cards.filter((c) =>
      c.name.toLowerCase().includes(needle)
      || (c.typeLine ?? '').toLowerCase().includes(needle));
  }, [filter, request]);

  const close = () => { setFilter(''); onHide(); };

  return (
    <Modal show={Boolean(request)} onHide={close} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="h6 mb-0">
          {request?.title} · {request?.cards.length ?? 0}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Control
          size="sm"
          className="mb-3"
          value={filter}
          placeholder={t('playtest.filterCards', 'Card name or type…')}
          onChange={(e) => setFilter(e.target.value)}
        />
        {cards.length === 0 ? (
          <p className="text-muted small mb-0">{t('playtest.noCards', 'No cards.')}</p>
        ) : (
          <ul className="pt-zone-list">
            {cards.map((card, index) => (
              <li key={card.uid} className="pt-zone-list__row">
                <span className="pt-zone-list__pos">{request?.hidden ? index + 1 : ''}</span>
                <span className="pt-zone-list__name">
                  {card.name}
                  {card.typeLine && <em className="text-muted"> · {card.typeLine}</em>}
                </span>
                <span className="pt-zone-list__actions">
                  <Button size="sm" variant="outline-primary"
                    onClick={() => onMove(card.uid, 'hand')}>
                    {t('playtest.toHand', 'Hand')}
                  </Button>
                  <Button size="sm" variant="outline-secondary"
                    onClick={() => onMove(card.uid, 'battlefield')}>
                    {t('playtest.toBattlefield', 'Battlefield')}
                  </Button>
                  <Button size="sm" variant="outline-secondary"
                    onClick={() => onMove(card.uid, 'graveyard')}>
                    {t('playtest.toGraveyard', 'Graveyard')}
                  </Button>
                  {request?.zone === 'library' && (
                    <Button size="sm" variant="outline-secondary"
                      onClick={() => onMove(card.uid, 'library', { position: 'bottom' })}>
                      {t('playtest.toBottom', 'Bottom')}
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal.Body>
      <Modal.Footer>
        {request?.hidden && (
          <span className="text-muted small me-auto">
            {t('playtest.searchHint', 'Searching your library does not shuffle it — shuffle after if it matters.')}
          </span>
        )}
        <Button size="sm" variant="secondary" onClick={close}>{t('common.close', 'Close')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
