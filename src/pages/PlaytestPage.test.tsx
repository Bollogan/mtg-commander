import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import '../i18n';
import deckReducer, { type Deck, type DeckCard } from '../features/deck/deckSlice';
import { PlaytestPage } from './PlaytestPage';

// The page reads the deck out of the store; the refresh fetch it fires on mount is left
// pending so it never overwrites the preloaded deck.
vi.mock('../api/client', () => ({
  apiClient: { get: vi.fn(() => new Promise(() => {})), post: vi.fn() },
  setSessionExpiredHandler: vi.fn(),
  API_BASE: '',
  TOKEN_KEY: 'token',
  REFRESH_KEY: 'refresh',
}));

const deckCard = (name: string, qty: number, typeLine: string, category: string | null = null): DeckCard => ({
  scryfallId: name.toLowerCase().replace(/\s+/g, '-'),
  qty,
  name,
  manaCost: null,
  cmc: 1,
  typeLine,
  colors: null,
  oracleText: null,
  imageUrl: null,
  category,
  foil: false,
  rarity: null,
  colorIdentity: null,
  legalities: null,
  usd: null,
  usdFoil: null,
  eur: null,
  eurFoil: null,
});

const deck = {
  id: 'deck-1',
  ownerId: 'u1',
  ownerName: 'Tester',
  ownerAvatarUrl: null,
  name: 'Test Deck',
  format: 'commander',
  visibility: 'PRIVATE',
  description: null,
  commanderName: 'Test Commander',
  cards: [
    deckCard('Test Commander', 1, 'Legendary Creature — Human', 'Commander'),
    deckCard('Forest', 30, 'Basic Land — Forest'),
    deckCard('Llanowar Elves', 30, 'Creature — Elf Druid'),
  ],
  categories: [],
  stats: {
    totalCards: 61, manaCurve: {}, typeDistribution: {}, colorDistribution: {},
    synergies: [], averageCmc: 1,
  },
  views: 0,
  likes: 0,
  liked: false,
  createdAt: '', updatedAt: '',
} as unknown as Deck;

const renderPage = () => {
  const store = configureStore({
    reducer: { deck: deckReducer },
    preloadedState: {
      deck: {
        ...deckReducer(undefined, { type: '@@init' }),
        current: deck,
        status: 'succeeded' as const,
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/decks/deck-1/playtest']}>
        <Routes>
          <Route path="/decks/:id/playtest" element={<PlaytestPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

const handCards = () => within(document.querySelector('.pt-row--hand') as HTMLElement)
  .getAllByRole('button');

describe('PlaytestPage', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.42);
  });

  it('deals an opening hand and starts in the mulligan step', () => {
    renderPage();
    expect(screen.getByText('Opening hand')).toBeInTheDocument();
    expect(handCards()).toHaveLength(7);
    // The commander waits in the command zone, not the library.
    expect(screen.getByText('Command zone')).toBeInTheDocument();
  });

  it('keeps the hand and moves to turn one without drawing on the play', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Keep this hand' }));

    expect(screen.queryByText('Opening hand')).not.toBeInTheDocument();
    expect(handCards()).toHaveLength(7);
    expect(screen.getByText('Library').closest('button')).toHaveTextContent('53');
  });

  it('requires bottoming a card after a mulligan before keeping', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Mulligan/ }));
    expect(screen.getByText('Pick 1 card(s) to put on the bottom.')).toBeInTheDocument();

    const keep = screen.getByRole('button', { name: 'Keep this hand' });
    expect(keep).toBeDisabled();

    await user.click(handCards()[0]);
    expect(keep).toBeEnabled();
    await user.click(keep);
    expect(handCards()).toHaveLength(6);
  });

  it('advances the turn, drawing a card', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Keep this hand' }));
    await user.click(screen.getByRole('button', { name: 'Next turn (untap + draw)' }));

    expect(handCards()).toHaveLength(8);
    // "Turn" also labels a column of the odds table, so read the header counter directly.
    expect(document.querySelector('.pt-header__stats .pt-stat strong')).toHaveTextContent('2');
  });

  it('undoes the last action', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Keep this hand' }));
    await user.click(screen.getByRole('button', { name: 'Draw' }));
    expect(handCards()).toHaveLength(8);

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(handCards()).toHaveLength(7);
  });

  it('shows the draw odds for the deck alongside the board', () => {
    renderPage();
    // 30 lands out of the 60-card library (the commander is not part of the population).
    expect(screen.getByText(/30 of 60 cards/)).toBeInTheDocument();
  });
});
