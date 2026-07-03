import { useEffect, useRef, useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addCardToDraft,
  autocompleteCards,
  clearAutocomplete,
  fetchCardByName,
  searchCards,
} from '../../features/deck/deckSlice';

const DEBOUNCE_MS = 180;

export const QuickAddBar = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { autocompleteResults, autocompleteStatus } = useAppSelector((s) => s.deck);

  const [mode, setMode] = useState<'name' | 'syntax'>('name');
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "'") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (mode !== 'name') {
      dispatch(clearAutocomplete());
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.trim().length >= 2) {
        dispatch(autocompleteCards({ query: query.trim(), limit: 6 }));
      } else {
        dispatch(clearAutocomplete());
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mode, dispatch]);

  useEffect(() => {
    setActiveIndex(0);
    setIsOpen(mode === 'name' && autocompleteResults.length > 0 && query.trim().length >= 2);
  }, [autocompleteResults, query, mode]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const addByName = (name: string) => {
    dispatch(fetchCardByName(name))
      .unwrap()
      .then((card) => {
        dispatch(addCardToDraft(card));
        setQuery('');
        setIsOpen(false);
        dispatch(clearAutocomplete());
        inputRef.current?.focus();
      })
      .catch(() => {
        // Card not found; keep query for user to correct.
      });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (mode === 'name' && isOpen && autocompleteResults.length > 0) {
      const selected = autocompleteResults[Math.min(activeIndex, autocompleteResults.length - 1)];
      addByName(selected.name);
      return;
    }

    if (mode === 'name') {
      addByName(trimmed);
    } else {
      dispatch(searchCards(trimmed));
    }
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
    <div ref={containerRef} className="position-relative mb-3">
      <Form onSubmit={onSubmit}>
        <InputGroup>
          <Form.Control
            ref={inputRef}
            placeholder={
              mode === 'name'
                ? t('builder.quickAddPlaceholder', "Quick add: type a card name (Ctrl+' )")
                : t('builder.syntaxAddPlaceholder', 'Syntax search: t:instant c:u…')
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => {
              if (autocompleteResults.length > 0) setIsOpen(true);
            }}
            autoComplete="off"
          />
          <Button
            variant="outline-secondary"
            onClick={() => setMode((m) => (m === 'name' ? 'syntax' : 'name'))}
          >
            {mode === 'name' ? t('builder.modeName', 'Name') : t('builder.modeSyntax', 'Syntax')}
          </Button>
          <Button type="submit" variant="primary" disabled={autocompleteStatus === 'loading' || !query.trim()}>
            {mode === 'name' ? '+' : t('builder.search')}
          </Button>
        </InputGroup>
      </Form>

      {isOpen && (
        <div
          className="position-absolute w-100 bg-body border rounded shadow mt-1"
          style={{ zIndex: 1040, maxHeight: 280, overflowY: 'auto' }}
        >
          {autocompleteResults.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={`list-group-item list-group-item-action d-flex align-items-center gap-2 w-100 border-0 text-start ${
                idx === activeIndex ? 'active' : ''
              }`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => addByName(item.name)}
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  style={{ width: 32, height: 45, objectFit: 'cover', borderRadius: 4 }}
                />
              )}
              <div className="text-truncate">
                <div className="fw-medium">{item.name}</div>
                <div className="text-muted small">{item.typeLine}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
