import { useState } from 'react';

interface SidebarProps {
  currentView: 'search' | 'decks' | 'new-deck';
  onViewChange: (view: 'search' | 'decks' | 'new-deck') => void;
}

export const Sidebar = ({ currentView, onViewChange }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h2>MTG Builder</h2>
        <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? '◄' : '►'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentView === 'search' ? 'active' : ''}`}
          onClick={() => onViewChange('search')}
        >
          <span className="icon">🔍</span> {isOpen && (<h3>Buscar Cartas</h3>)}
        </button>

        <button
          className={`nav-item ${currentView === 'decks' ? 'active' : ''}`}
          onClick={() => onViewChange('decks')}
        >
          <span className="icon">📚</span> {isOpen && (<h3>Mis Mazos</h3>)}
        </button>

        <button
          className={`nav-item ${currentView === 'new-deck' ? 'active' : ''}`}
          onClick={() => onViewChange('new-deck')}
        >
          <span className="icon">➕</span> {isOpen && (<h3>Nuevo Mazo</h3>)}
        </button>

        <div className="sidebar-footer">
          <button className="login-btn">
            <span className="icon">👤</span> Inicia sesión
          </button>
        </div>
      </nav>
    </aside>
  );
};