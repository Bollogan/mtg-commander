import { useDrag } from 'react-dnd';
import { Badge, Button, ListGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addCardToDraft, type ScryfallCard } from '../../features/deck/deckSlice';
import { CardAutocomplete } from './CardAutocomplete';

export const CARD_DND_TYPE = 'CARD';

const SearchResultItem = ({ card }: { card: ScryfallCard }) => {
  const dispatch = useAppDispatch();
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: CARD_DND_TYPE,
      item: card,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [card],
  );

  return (
    <ListGroup.Item
      as="div"
      ref={dragRef as unknown as React.Ref<HTMLDivElement>}
      className="d-flex justify-content-between align-items-center"
      style={{ cursor: 'grab', opacity: isDragging ? 0.5 : 1 }}
      title="Drag into your deck, or click +"
    >
      <span className="text-truncate me-2">
        {card.name}
        {card.manaCost ? <span className="text-muted small ms-2">{card.manaCost}</span> : null}
      </span>
      <Button size="sm" variant="outline-success" onClick={() => dispatch(addCardToDraft(card))}>
        +
      </Button>
    </ListGroup.Item>
  );
};

export const CardSearch = () => {
  const { t } = useTranslation();
  const { searchResults, searchStatus } = useAppSelector((s) => s.deck);

  return (
    <div>
      <CardAutocomplete />

      {searchStatus === 'failed' && (
        <Badge bg="danger" className="mt-2">
          {t('builder.searchFailed', 'Search failed — try again')}
        </Badge>
      )}

      {searchStatus === 'succeeded' && searchResults.length > 0 && (
        <div className="mt-3">
          <div className="small text-muted mb-2">
            {t('builder.advancedResults', 'Advanced search results')}
          </div>
          <ListGroup style={{ maxHeight: 360, overflowY: 'auto' }}>
            {searchResults.map((card) => (
              <SearchResultItem key={card.id} card={card} />
            ))}
          </ListGroup>
        </div>
      )}

      {searchStatus === 'succeeded' && searchResults.length === 0 && (
        <ListGroup className="mt-3">
          <ListGroup.Item className="text-muted">{t('builder.noResults', 'No results.')}</ListGroup.Item>
        </ListGroup>
      )}
    </div>
  );
};
