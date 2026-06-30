import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { HomePage } from './pages/HomePage';
import { DecksPage } from './pages/DecksPage';
import { DeckBuilderPage } from './pages/DeckBuilderPage';
import { GameSimulatorPage } from './pages/GameSimulatorPage';
import { EventsPage } from './pages/EventsPage';
import { AccountPage } from './pages/AccountPage';
import { CardDetailPage } from './pages/CardDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './components/social/ProfilePage';
import { ForumsPage } from './components/social/ForumsPage';
import { ForumThread } from './components/social/ForumThread';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RequireAuth } from './components/RequireAuth';
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
          <Route path="/decks/build" element={<RequireAuth><DeckBuilderPage /></RequireAuth>} />
          <Route path="/decks/build/:id" element={<RequireAuth><DeckBuilderPage /></RequireAuth>} />
          <Route path="/play" element={<RequireAuth><GameSimulatorPage /></RequireAuth>} />
          <Route path="/play/:roomId" element={<RequireAuth><GameSimulatorPage /></RequireAuth>} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
          <Route path="/card/:id" element={<CardDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/users/:id" element={<ProfilePage />} />
          <Route path="/forums" element={<ForumsPage />} />
          <Route path="/forums/:id" element={<ForumThread />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
