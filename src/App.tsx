import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { HomePage } from './pages/HomePage';
import { DecksPage } from './pages/DecksPage';
import { DeckBuilderPage } from './pages/DeckBuilderPage';
import { CardDetailPage } from './pages/CardDetailPage';
import { ProfilePage } from './components/social/ProfilePage';
import { ForumsPage } from './components/social/ForumsPage';
import { ForumThread } from './components/social/ForumThread';
import { AuthPage } from './components/social/AuthPage';
import { useNotificationStream } from './features/notifications/useNotificationStream';
import './App.css';

function App() {
  // Opens the SSE notification stream whenever the user is authenticated.
  useNotificationStream();

  return (
    <BrowserRouter>
      <div className="app-shell">
        <TopNav />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/decks/build" element={<DeckBuilderPage />} />
          <Route path="/decks/build/:id" element={<DeckBuilderPage />} />
          <Route path="/card/:id" element={<CardDetailPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/users/:id" element={<ProfilePage />} />
          <Route path="/forums" element={<ForumsPage />} />
          <Route path="/forums/:id" element={<ForumThread />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
