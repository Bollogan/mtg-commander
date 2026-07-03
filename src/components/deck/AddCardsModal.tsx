import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, InputGroup, Modal, Spinner, Tab, Tabs } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addCardToDraft,
  autocompleteCards,
  changeQty,
  clearAutocomplete,
  fetchCardById,
  removeCardFromDraft,
  searchCards,
  type ScryfallCard,
} from '../../features/deck/deckSlice';
import { CardTile } from './CardTile';
import { SynergyPanel } from './SynergyPanel';

const DEBOUNCE_MS = 180;

interface AddCardsModalProps {
  show: boolean;
  onHide: () => void;
  deckId: string | null;
}

export const AddCardsModal = ({ show, onHide, deckId }: AddCardsModalProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { autocompleteResults, autocompleteStatus, searchResults, searchStatus } = useAppSelector(
    (s) => s.deck,
  );

  const draftCards = useAppSelector((s) => s.deck.draft.cards);
  const qtyById = useMemo(() => {
    const map = new Map<string, number>();
    draftCards.forEach((c) => map.set(c.scryfallId, c.qty));
    return map;
  }, [draftCards]);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      dispatch(clearAutocomplete());
    }
  }, [show, dispatch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.trim().length >= 2) {
        dispatch(autocompleteCards({ query: query.trim(), limit: 12 }));
      } else {
        dispatch(clearAutocomplete());
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, dispatch]);

  const addById = (id: string) => {
    dispatch(fetchCardById(id))
      .unwrap()
      .then((card) => {
        dispatch(addCardToDraft(card));
      })
      .catch(() => undefined);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    dispatch(searchCards(query.trim()));
  };

  const displayedCards: ScryfallCard[] =
    searchStatus === 'succeeded' && searchResults.length > 0
      ? searchResults
      : autocompleteResults.map((item) => ({
          id: item.id,
          name: item.name,
          manaCost: item.manaCost ?? '',
          cmc: 0,
          colors: [],
          colorIdentity: [],
          typeLine: item.typeLine ?? '',
          oracleText: '',
          power: null,
          toughness: null,
          imageUris: item.imageUrl
            ? { small: item.imageUrl, normal: item.imageUrl, large: null, artCrop: null }
            : null,
          setName: '',
          rarity: '',
          legalities: null,
          prices: null,
        }));

  const isLoading = autocompleteStatus === 'loading' || searchStatus === 'loading';

  return (
    <Modal show={show} onHide={onHide} size="xl" centered className="add-cards-modal">
      <Modal.Header closeButton>
        <Modal.Title>{t('builder.addCards', 'Add cards')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs activeKey={activeTab} onSelect={(k) => k && setActiveTab(k)} className="add-cards-tabs mb-3">
          <Tab eventKey="search" title={t('builder.addCardsSearch', 'Search')}>
            <Form onSubmit={submitSearch}>
              <InputGroup className="mb-3">
                <Form.Control
                  ref={inputRef}
                  placeholder={t('builder.searchPlaceholder', 'Search cards by name…')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
                <Button type="submit" variant="primary" disabled={!query.trim()}>
                  {t('builder.search', 'Search')}
                </Button>
              </InputGroup>
            </Form>

            {isLoading && (
              <div className="text-center my-4">
                <Spinner animation="border" />
              </div>
            )}

            {displayedCards.length > 0 ? (
              <div className="card-grid-4">
                {displayedCards.map((card) => (
                  <CardTile
                    key={card.id}
                    scryfallId={card.id}
                    name={card.name}
                    imageUrl={card.imageUris?.normal ?? card.imageUris?.small ?? null}
                    qty={qtyById.get(card.id) ?? 0}
                    addLabel={t('builder.addToDeck', '+ Add')}
                    onAdd={() => addById(card.id)}
                    onInc={() => dispatch(changeQty({ scryfallId: card.id, delta: 1 }))}
                    onDec={() => dispatch(changeQty({ scryfallId: card.id, delta: -1 }))}
                    onRemove={() => dispatch(removeCardFromDraft(card.id))}
                  />
                ))}
              </div>
            ) : (
              !isLoading &&
              query.trim().length >= 2 && (
                <p className="text-muted text-center">{t('builder.noResults', 'No results.')}</p>
              )
            )}
          </Tab>

          <Tab eventKey="suggestions" title={t('builder.addCardsSuggestions', 'Suggestions')}>
            <SynergyPanel deckId={deckId} />
          </Tab>
        </Tabs>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t('builder.done', 'Done')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
