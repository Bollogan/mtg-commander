import { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { searchCards, fetchTopCommanders } from '../services/scryfallApi';
import { type Card } from '../types/cardType';
import './SearchBar.css';

interface SearchBarProps {
  onResultsChange: (cards: Card[], isTopCommanders: boolean) => void;
}

export const SearchBar = ({ onResultsChange }: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedTerm = useDebounce(searchTerm, 500);

  const {
    data: searchResults = [],
    isLoading: isSearchLoading,
    isError: isSearchError,
    error: searchError,
  } = useQuery<Card[]>({
    queryKey: ['cards', debouncedTerm],
    queryFn: () => searchCards(debouncedTerm),
    enabled: debouncedTerm.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });

  const { data: topCommanders = [] } = useQuery<Card[]>({
    queryKey: ['topCommanders'],
    queryFn: () => fetchTopCommanders(20),
    staleTime: 1000 * 60 * 60 * 24, // 24h
  });

  useEffect(() => {
    if (debouncedTerm.length < 2) {
      onResultsChange(topCommanders, true);
    } else {
      onResultsChange(searchResults, false);
    }
  }, [debouncedTerm, topCommanders, searchResults, onResultsChange]);

  return (
    <div className="searchbar-container">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Busca una carta..."
        className="search-input"
      />

      {/* Mensajes solo para búsqueda activa */}
      {isSearchLoading && debouncedTerm && (
        <p className="search-message loading visible">Buscando en el multiverso...</p>
      )}

      {isSearchError && (
        <p className="search-message error visible">
          Error al invocar cartas: {(searchError as Error)?.message || 'Intenta de nuevo'}
        </p>
      )}

      {!isSearchLoading && searchResults.length === 0 && debouncedTerm && (
        <p className="search-message visible">No se encontraron cartas en este plano.</p>
      )}
    </div>
  );
};

// Hook de debounce reutilizable
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}