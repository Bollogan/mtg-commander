import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../../i18n';
import i18n from 'i18next';
import { DrawOddsPanel } from './DrawOddsPanel';
import type { PlaytestCard } from '../../features/playtest/playtestEngine';

const make = (name: string, typeLine: string, count: number): PlaytestCard[] =>
  Array.from({ length: count }, (_, i) => ({
    uid: `${name}#${i}`,
    scryfallId: name,
    name,
    imageUrl: null,
    typeLine,
    manaCost: null,
    cmc: 1,
    isLand: typeLine.toLowerCase().includes('land'),
    tapped: false,
    counters: 0,
    faceDown: false,
  }));

// A 60-card deck: 24 lands, 4 Lightning Bolt, 32 other creatures.
const pool: PlaytestCard[] = [
  ...make('Mountain', 'Basic Land — Mountain', 24),
  ...make('Lightning Bolt', 'Instant', 4),
  ...make('Goblin Guide', 'Creature — Goblin Scout', 32),
];

const renderPanel = () => render(
  <DrawOddsPanel deckPool={pool} handSize={7} onThePlay cardsDrawn={10} landsDrawn={4} />,
);

describe('DrawOddsPanel', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows a row per turn with the cards seen by then', () => {
    renderPanel();
    const rows = screen.getAllByRole('row').slice(1); // drop the header
    expect(rows).toHaveLength(10);
    // On the play, turn 1 sees the opening seven and each turn adds one draw step.
    expect(within(rows[0]).getByText('7')).toBeInTheDocument();
    expect(within(rows[9]).getByText('16')).toBeInTheDocument();
  });

  it('defaults to lands and reports the keepable-hand figure', () => {
    renderPanel();
    expect(screen.getByText(/24 of 60 cards/)).toBeInTheDocument();
    expect(screen.getByText(/opening hands hold 2–5 lands/)).toBeInTheDocument();
  });

  it('recomputes when a specific card is selected', async () => {
    renderPanel();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText('Looking for'), 'card:Lightning Bolt');

    expect(screen.getByText(/4 of 60 cards/)).toBeInTheDocument();
    // Turn 1 is the textbook "4-of in an opening seven" figure, ~39.9%.
    const turnOne = screen.getAllByRole('row')[1];
    expect(within(turnOne).getByText(/^(39|40)\.\d%$/)).toBeInTheDocument();
  });

  it('reports what this game has actually drawn', () => {
    renderPanel();
    expect(screen.getByText(/10 cards drawn · 4 lands \(40%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Deck runs 40% lands\./)).toBeInTheDocument();
  });
});
