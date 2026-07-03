import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Form, InputGroup, Button, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { DeckCard, DeckCategory } from '../../features/deck/deckSlice';
import { groupCards, type GroupBy } from './deckView';
import { hyperProbability, type DrawMode } from '../../services/hypergeometric';

const GROUP_OPTIONS: GroupBy[] = ['category', 'type', 'color', 'cmc', 'rarity'];
const MODES: DrawMode[] = ['atLeast', 'exactly', 'atMost'];

interface DrawCalculatorProps {
  cards: DeckCard[];
  categories: DeckCategory[];
}

const Stepper = ({ value, onChange, min = 0, max = 999 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) => (
  <InputGroup className="stepper">
    <Button variant="outline-secondary" onClick={() => onChange(Math.max(min, value - 1))}>−</Button>
    <Form.Control
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
      className="text-center"
    />
    <Button variant="outline-secondary" onClick={() => onChange(Math.min(max, value + 1))}>+</Button>
  </InputGroup>
);

/**
 * #7 — Hypergeometric "chance to draw" calculator + a quantity chart, both driven by a shared
 * group-by selector (the user's own categories, or type/colour/CMC/rarity).
 */
export const DrawCalculator = ({ cards, categories }: DrawCalculatorProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<DrawMode>('atLeast');
  const [count, setCount] = useState(1);
  const [drawn, setDrawn] = useState(7);
  const [groupBy, setGroupBy] = useState<GroupBy>('category');

  const population = useMemo(() => cards.reduce((sum, c) => sum + c.qty, 0), [cards]);

  const rows = useMemo(() => {
    const groups = groupCards(cards, groupBy, 'name', categories);
    return groups.map((g) => ({
      key: g.key,
      qty: g.count,
      odds: hyperProbability(population, g.count, drawn, count, mode) * 100,
    }));
  }, [cards, categories, groupBy, population, drawn, count, mode]);

  const chartData = useMemo(() => rows.map((r) => ({ name: r.key, qty: r.qty })), [rows]);

  return (
    <div className="draw-calc">
      <div className="draw-calc__controls">
        <span className="text-muted small">{t('stats.probOfDrawing', 'Probability of drawing')}</span>
        <Form.Select size="sm" value={mode} onChange={(e) => setMode(e.target.value as DrawMode)} className="w-auto">
          {MODES.map((m) => <option key={m} value={m}>{t(`stats.mode_${m}`, m)}</option>)}
        </Form.Select>
        <Stepper value={count} onChange={setCount} min={0} />
        <span className="text-muted small">{t('stats.cardsBy', 'card(s) by')}</span>
        <Form.Select size="sm" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="w-auto">
          {GROUP_OPTIONS.map((g) => <option key={g} value={g}>{t(`stats.group_${g}`, g)}</option>)}
        </Form.Select>
        <span className="text-muted small">{t('stats.havingDrawn', 'having drawn')}</span>
        <Stepper value={drawn} onChange={setDrawn} min={1} max={population || 999} />
        <span className="text-muted small">{t('stats.cards', 'card(s)')}</span>
      </div>

      <div className="draw-calc__grid">
        <Table size="sm" hover className="draw-table mb-0">
          <thead>
            <tr>
              <th>{t(`stats.group_${groupBy}`, groupBy)}</th>
              <th className="text-end">{t('stats.qty', 'Qty')}</th>
              <th className="text-end">{t('stats.odds', 'Odds')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="text-truncate">{r.key}</td>
                <td className="text-end tabular-nums">{r.qty}</td>
                <td className="text-end tabular-nums">{Math.round(r.odds)}%</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="text-muted small text-center">{t('stats.noData', 'No cards yet.')}</td></tr>
            )}
          </tbody>
        </Table>

        <div className="draw-calc__chart">
          <div className="small text-muted mb-2">{t('stats.quantityOf', 'Quantity of')} · {t(`stats.group_${groupBy}`, groupBy)}</div>
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 34)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
              <XAxis type="number" allowDecimals={false} fontSize={11} />
              <YAxis type="category" dataKey="name" width={92} fontSize={11} />
              <Tooltip />
              <Bar dataKey="qty" fill="#d8a24a" radius={[0, 4, 4, 0]} name={t('stats.qty', 'Qty') as string} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
