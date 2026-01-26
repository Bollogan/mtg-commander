import { SearchBar } from './components/SearchBar';
import { CardGrid } from './components/CardGrid';
import { DeckZone } from './components/DeckZone';
import { useState } from 'react';
import { type Card } from './types/cardType';

function App() {
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [isTopCommanders, setIsTopCommanders] = useState(false);

  const handleResults = (cards: Card[], isTop: boolean) => {
    setSearchResults(cards);
    setIsTopCommanders(isTop);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>MTG Deck Builder - Inspired by Archidekt</h1>

      <SearchBar onResultsChange={handleResults} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '32px' }}>
        <div>
          <h2>{isTopCommanders ? 'Top Comandantes (EDHREC)' : 'Resultados de búsqueda'}</h2>
          <CardGrid cards={searchResults} />
        </div>

        <div>
          <DeckZone />
        </div>
      </div>
    </div>
  );
}

export default App;