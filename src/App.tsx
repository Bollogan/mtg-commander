import { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { CardGrid } from './components/CardGrid';
import { DeckZone } from './components/DeckZone';
import { Sidebar } from './components/Sidebar';
import { type Card } from './types/cardType';
import './App.css';

function App() {
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [isTopCommanders, setIsTopCommanders] = useState(false);
  const [currentView, setCurrentView] = useState<'search' | 'decks' | 'new-deck'>('search');

  const handleResults = (cards: Card[], isTop: boolean) => {
    setSearchResults(cards);
    setIsTopCommanders(isTop);
  };

  return (
    <div className="app-layout">
      {/* Menú lateral */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Contenido principal */}
      <main className="main-content">
        <header className="app-header">
          <h1 className="app-title">MTG Deck Builder</h1>
          <p className="app-subtitle">Forja tu legado en el multiverso</p>
        </header>

        {currentView === 'search' && (
          <section className="search-view full-width">
            <SearchBar onResultsChange={handleResults} />
            <div className="results-container">
              <h2 className="section-title">
                {isTopCommanders ? 'Top Comandantes (orden por popularidad EDHREC)' : 'Resultados de búsqueda'}
              </h2>
              <CardGrid cards={searchResults} isTop={isTopCommanders} />
            </div>
          </section>
        )}

        {currentView === 'decks' && (
          <section className="deck-view">
            <h2 className="section-title">Mis Mazos</h2>
            <p>Lista de mazos guardados (próximamente con login)</p>
          </section>
        )}

        {currentView === 'new-deck' && (
          <section className="deck-view">
            <h2 className="section-title">Construyendo nuevo mazo</h2>
            <DeckZone />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;