import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { HomePage } from './pages/HomePage';
import { DecksPage } from './pages/DecksPage';
import { CardDetailPage } from './pages/CardDetailPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <TopNav />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/card/:id" element={<CardDetailPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;