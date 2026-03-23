import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Container, Pagination } from 'react-bootstrap';
import { SearchBar } from '../components/SearchBar';
import { CardGrid } from '../components/CardGrid';
import { fetchTopCommanders, searchCards, type SearchResponse, type TopCommander } from '../services/scryfallApi';

export const HomePage = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const onSearch = useCallback((term: string) => {
    setSearchTerm(term.trim());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const { data: searchResponse, isLoading: searching } = useQuery<SearchResponse>({
    queryKey: ['cards', searchTerm, page],
    queryFn: () => searchCards(searchTerm, page),
    enabled: searchTerm.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3
  });

  const { data: topCommanders = [], isLoading: loadingTop } = useQuery<TopCommander[]>({
    queryKey: ['topCommanders'],
    queryFn: () => fetchTopCommanders(20),
    staleTime: 1000 * 60 * 60
  });

  const showTop = searchTerm.length < 2;
  const cardsToShow = useMemo(() => {
    if (!showTop) {
      return searchResponse?.cards ?? [];
    }
    return topCommanders.map(item => ({
      ...item.card,
      deckCount: item.deckCount
    }));
  }, [showTop, topCommanders, searchResponse]);

  const totalCards = searchResponse?.totalCards ?? 0;
  const pageSize = searchResponse?.pageSize ?? 20;
  const totalPages = totalCards > 0 ? Math.ceil(totalCards / pageSize) : 0;

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) {
      return [] as ReactNode[];
    }

    const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
    const sorted = Array.from(pages)
      .filter(value => value >= 1 && value <= totalPages)
      .sort((a, b) => a - b);

    const items: ReactNode[] = [];
    let last = 0;
    sorted.forEach(value => {
      if (last && value - last > 1) {
        items.push(<Pagination.Ellipsis key={`ellipsis-${last}-${value}`} disabled />);
      }
      items.push(
        <Pagination.Item
          key={value}
          active={value === page}
          onClick={() => setPage(value)}
        >
          {value}
        </Pagination.Item>
      );
      last = value;
    });

    return items;
  }, [page, totalPages]);

  return (
    <Container className="page-container">
      <div className="page-header">
        <h1>{t('app.title')}</h1>
        <p>{t('app.subtitle')}</p>
      </div>
      <SearchBar onSearch={onSearch} />
      <h2 className="section-title">
        {showTop ? t('search.topTitle') : t('search.resultsTitle')}
      </h2>
      <CardGrid
        cards={cardsToShow}
        loading={showTop ? loadingTop : searching}
      />
      {!showTop && totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <Pagination className="mb-0 app-pagination">
            <Pagination.Prev
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page <= 1}
            />
            {paginationItems}
            <Pagination.Next
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            />
          </Pagination>
        </div>
      )}
    </Container>
  );
};
