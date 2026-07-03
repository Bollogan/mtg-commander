import { useEffect, useRef, useState, useCallback } from 'react';
import { Form, ListGroup, Spinner } from 'react-bootstrap';
import { useAppDispatch } from '../../store/hooks';
import { autocompleteCards, type AutocompleteItem } from '../../features/deck/deckSlice';

const DEBOUNCE_MS = 180;

interface CommanderAutocompleteProps {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CommanderAutocomplete = ({ value, onChange, placeholder, disabled }: CommanderAutocompleteProps) => {
  const dispatch = useAppDispatch();

  // Local results (not the shared store) so typing here never clashes with the
  // quick-add bar / add-cards modal, and stale responses can be discarded.
  const [results, setResults] = useState<AutocompleteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const requestAutocomplete = useCallback((val: string) => {
    const trimmed = val.trim();
    if (trimmed.length < 2) {
      seqRef.current += 1; // invalidate any in-flight request
      setResults([]);
      setLoading(false);
      return;
    }
    const reqId = ++seqRef.current;
    setLoading(true);
    dispatch(autocompleteCards({ query: trimmed, limit: 6, commanderOnly: true }))
      .unwrap()
      .then((items) => {
        if (reqId !== seqRef.current) return; // superseded by a newer keystroke
        setResults(items);
      })
      .catch(() => {
        if (reqId !== seqRef.current) return;
        setResults([]);
      })
      .finally(() => {
        if (reqId === seqRef.current) setLoading(false);
      });
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
    setIsOpen(results.length > 0 && query.trim().length >= 2);
  }, [results, query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selectName = (name: string) => {
    onChange(name);
    setQuery(name);
    setIsOpen(false);
    seqRef.current += 1;
    setResults([]);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && results.length > 0 && activeIndex >= 0) {
        selectName(results[Math.min(activeIndex, results.length - 1)].name);
      } else if (query.trim()) {
        selectName(query.trim());
      }
      return;
    }
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="position-relative">
      <Form.Control
        ref={inputRef}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        autoComplete="off"
        disabled={disabled}
      />
      {loading && (
        <Spinner
          animation="border"
          size="sm"
          className="position-absolute"
          style={{ right: 10, top: 10 }}
        />
      )}

      {isOpen && (
        <ListGroup
          className="autocomplete-dropdown position-absolute w-100 shadow mt-1"
          style={{ zIndex: 1050, maxHeight: 300, overflowY: 'auto' }}
        >
          {results.map((item, idx) => (
            <ListGroup.Item
              key={item.id}
              action
              active={idx === activeIndex}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => selectName(item.name)}
              className="d-flex align-items-center gap-2"
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
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
};
