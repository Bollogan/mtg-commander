import { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchTopCommanders, searchCards } from '../services/scryfallApi';
import { type Card } from '../types/cardType';

interface SearchBarProps {
  onResultsChange: (cards: Card[], isTopCommanders: boolean) => void;
}

export const SearchBar = ({ onResultsChange }: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const [debouncedTerm, setDebouncedTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data = [], isLoading, isError, error } = useQuery<Card[]>({
    queryKey: ['cards', debouncedTerm],
    queryFn: () => searchCards(debouncedTerm),
    enabled: debouncedTerm.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });

  const { data: topCommanders = [] } = useQuery<Card[]>({
    queryKey: ['topCommanders'],
    queryFn: () => fetchTopCommanders(50),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (debouncedTerm.length < 2 && topCommanders.length > 0) {
      onResultsChange(topCommanders, true);
    } else {
      onResultsChange(data, false);
    }
  }, [data, debouncedTerm, topCommanders, onResultsChange]);

  

  return (
    <div style={{ marginBottom: '20px' }}>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Busca una carta (ej: Teferi, relámpago, criatura roja cmc=3...)"
        style={{ width: '100%', padding: '12px', fontSize: '16px' }}
      />

      {isLoading && debouncedTerm && <p>Cargando cartas...</p>}
      {isError && <p style={{ color: 'red' }}>Error: {(error as Error)?.message || 'Intenta otra búsqueda'}</p>}
      {!isLoading && data.length === 0 && debouncedTerm && (
        <p>No se encontraron cartas. Prueba con otro término o filtro.</p>
      )}
      {!debouncedTerm && !isLoading && (
        <p style={{ color: '#aaa', fontSize: '14px' }}>Top 50 commanders.</p>
      )}
    </div>
  );
};