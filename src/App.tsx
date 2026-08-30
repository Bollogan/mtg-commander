import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { HomePage } from './pages/HomePage';
import { CommandersPage } from './pages/CommandersPage';
import { AdvancedSearchPage } from './pages/AdvancedSearchPage';
import { DecksPage } from './pages/DecksPage';
import { DeckNewPage } from './pages/DeckNewPage';
import { DeckDetailPage } from './pages/DeckDetailPage';
import { DeckBuilderPage } from './pages/DeckBuilderPage';
import { GameSimulatorPage, JoinRoomRedirect } from './pages/GameSimulatorPage';
import { EventsPage } from './pages/EventsPage';
import { AccountPage } from './pages/AccountPage';
import { CardDetailPage } from './pages/CardDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './components/social/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RequireAuth } from './components/RequireAuth';
import { useNotificationStream } from './features/notifications/useNotificationStream';
import './App.css';

// The forum module is a large, self-contained feature (discovery mosaic, constellation SVG,
// moderation dashboard, realtime). Code-split it so it only loads when a /forums route is visited.
const ForumsPage = lazy(() =>
  import('./components/social/ForumsPage').then((m) => ({ default: m.ForumsPage })));
const ForumThread = lazy(() =>
  import('./components/social/ForumThread').then((m) => ({ default: m.ForumThread })));
const PostDetailPage = lazy(() =>
  import('./components/social/PostDetailPage').then((m) => ({ default: m.PostDetailPage })));
const ForumModerationPage = lazy(() =>
  import('./components/social/forum/ForumModerationPage').then((m) => ({ default: m.ForumModerationPage })));
// The solo playtester pulls in its own board + odds code; keep it out of the main bundle.
const PlaytestPage = lazy(() =>
  import('./pages/PlaytestPage').then((m) => ({ default: m.PlaytestPage })));

function RouteFallback() {
  return <div className="route-fallback" aria-busy="true"><span className="route-spinner" /></div>;
}

function App() {
  // Opens the SSE notification stream whenever the user is authenticated.
  useNotificationStream();

  return (
    <BrowserRouter>
      <div className="app-shell">
        <TopNav />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<AdvancedSearchPage />} />
          <Route path="/commanders" element={<CommandersPage />} />
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/decks/new" element={<RequireAuth><DeckNewPage /></RequireAuth>} />
          <Route path="/decks/:id" element={<DeckDetailPage />} />
          <Route path="/decks/build" element={<RequireAuth><DeckBuilderPage /></RequireAuth>} />
          <Route path="/decks/build/:id" element={<RequireAuth><DeckBuilderPage /></RequireAuth>} />
          <Route path="/decks/:id/playtest" element={
            <Suspense fallback={<RouteFallback />}><PlaytestPage /></Suspense>
          } />
          <Route path="/play" element={<RequireAuth><GameSimulatorPage /></RequireAuth>} />
          <Route path="/play/:roomId" element={<RequireAuth><GameSimulatorPage /></RequireAuth>} />
          {/* Invite links are shared as /join/CODE; the room page does the actual joining. */}
          <Route path="/join/:roomId" element={<RequireAuth><JoinRoomRedirect /></RequireAuth>} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
          <Route path="/card/:id" element={<CardDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/users/:id" element={<ProfilePage />} />
          <Route path="/forums" element={<Suspense fallback={<RouteFallback />}><ForumsPage /></Suspense>} />
          <Route path="/forums/:id" element={<Suspense fallback={<RouteFallback />}><ForumThread /></Suspense>} />
          <Route path="/forums/:forumId/posts/:postId" element={
            <Suspense fallback={<RouteFallback />}><PostDetailPage /></Suspense>
          } />
          <Route path="/forums/:id/moderate" element={
            <RequireAuth><Suspense fallback={<RouteFallback />}><ForumModerationPage /></Suspense></RequireAuth>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
