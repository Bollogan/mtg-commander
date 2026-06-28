import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DeckCard } from '../../features/deck/deckSlice';

const BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'];

const cmcBucket = (cmc: number): string => {
  const rounded = Math.floor(cmc);
  if (rounded <= 0) return '0';
  return rounded >= 7 ? '7+' : String(rounded);
};

const isLand = (typeLine: string | null): boolean =>
  (typeLine ?? '').toLowerCase().includes('land');

/**
 * Live mana curve computed from the working draft (lands excluded), so it updates as the
 * user builds. Mirrors the server-side DeckStatsCalculator bucketing.
 */
export const ManaChart = ({ cards }: { cards: DeckCard[] }) => {
  const counts: Record<string, number> = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
  for (const card of cards) {
    if (isLand(card.typeLine)) continue;
    counts[cmcBucket(card.cmc)] += card.qty;
  }
  const data = BUCKETS.map((bucket) => ({ bucket, count: counts[bucket] }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="bucket" fontSize={12} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip />
        <Bar dataKey="count" fill="#6f42c1" radius={[4, 4, 0, 0]} name="Cards" />
      </BarChart>
    </ResponsiveContainer>
  );
};
