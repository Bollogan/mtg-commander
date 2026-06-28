import { useState } from 'react';
import { useDrag } from 'react-dnd';
import { Badge, Button, Form, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addCardToDraft, searchCards, type ScryfallCard } from '../../features/deck/deckSlice';

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
      <Button
        size="sm"
        variant="outline-success"
        onClick={() => dispatch(addCardToDraft(card))}
      >
        +
      </Button>
    </ListGroup.Item>
  );
};

export const CardSearch = () => {
  const dispatch = useAppDispatch();
  const { searchResults, searchStatus } = useAppSelector((s) => s.deck);
  const [query, setQuery] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) dispatch(searchCards(query.trim()));
  };

  return (
    <div>
      <Form onSubmit={submit}>
        <InputGroup className="mb-3">
          <Form.Control
            placeholder="Search Scryfall (e.g. goblin, t:dragon)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" variant="primary" disabled={searchStatus === 'loading'}>
            {searchStatus === 'loading' ? <Spinner size="sm" animation="border" /> : 'Search'}
          </Button>
        </InputGroup>
      </Form>

      {searchStatus === 'failed' && (
        <Badge bg="danger">Search failed — try again</Badge>
      )}

      <ListGroup style={{ maxHeight: 460, overflowY: 'auto' }}>
        {searchResults.map((card) => (
          <SearchResultItem key={card.id} card={card} />
        ))}
        {searchStatus === 'succeeded' && searchResults.length === 0 && (
          <ListGroup.Item className="text-muted">No results.</ListGroup.Item>
        )}
      </ListGroup>
    </div>
  );
};
