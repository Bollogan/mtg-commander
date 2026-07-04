import { useEffect, useRef, useState, useCallback } from 'react';
import { Form, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addCardToDraft,
  autocompleteCards,
  clearAutocomplete,
  fetchCardById,
  searchCards,
} from '../../features/deck/deckSlice';
import { ManaCost } from '../ManaCost';

const DEBOUNCE_MS = 180;

export const CardAutocomplete = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { autocompleteResults, autocompleteStatus } = useAppSelector((s) => s.deck);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestAutocomplete = useCallback((value: string) => {
    if (value.trim().length < 2) {
      dispatch(clearAutocomplete());
      return;
    }
    dispatch(autocompleteCards({ query: value.trim(), limit: 8 }));
  }, [dispatch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => requestAutocomplete(query), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, requestAutocomplete]);

  useEffect(() => {
    setActiveIndex(0);
    setIsOpen(autocompleteResults.length > 0 && query.trim().length >= 2);
  }, [autocompleteResults, query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const addById = (id: string) => {
    dispatch(fetchCardById(id))
      .unwrap()
      .then((card) => {
        dispatch(addCardToDraft(card));
        setQuery('');
        setIsOpen(false);
        dispatch(clearAutocomplete());
        inputRef.current?.focus();
      })
      .catch(() => {
        // Silently ignore; the card may have been removed from Scryfall.
      });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (autocompleteResults.length > 0 && activeIndex >= 0) {
      const selected = autocompleteResults[Math.min(activeIndex, autocompleteResults.length - 1)];
      addById(selected.id);
      return;
    }
    dispatch(searchCards(trimmed));
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || autocompleteResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % autocompleteResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + autocompleteResults.length) % autocompleteResults.length);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="position-relative">
      <Form onSubmit={submitSearch}>
        <InputGroup>
          <Form.Control
            ref={inputRef}
            placeholder={t('builder.searchPlaceholder', 'Search cards by name…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => {
              if (autocompleteResults.length > 0) setIsOpen(true);
            }}
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={autocompleteStatus === 'loading' || !query.trim()}
          >
            {autocompleteStatus === 'loading' ? (
              <Spinner animation="border" size="sm" />
            ) : (
              t('builder.search', 'Search')
            )}
          </button>
        </InputGroup>
      </Form>

      {isOpen && (
        <ListGroup
          className="autocomplete-dropdown position-absolute w-100 shadow mt-1"
          style={{ zIndex: 1050, maxHeight: 360, overflowY: 'auto' }}
        >
          {autocompleteResults.map((item, idx) => (
            <ListGroup.Item
              key={item.id}
              action
              active={idx === activeIndex}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => addById(item.id)}
              className="d-flex align-items-center gap-2"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 4 }}
                />
              )}
              <div className="text-truncate">
                <div className="fw-medium d-flex align-items-center gap-2">
                  <span className="text-truncate">{item.name}</span>
                  {item.manaCost ? <ManaCost manaCost={item.manaCost} size={14} /> : null}
                </div>
                <div className="text-muted small">{item.typeLine}</div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
};
