import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DeckCard } from '../../features/deck/deckSlice';
import { ManaSymbol } from '../ManaCost';
import { colorCurves, CURVE_BUCKETS, PIP_COLOR_HEX, type ColorCurve } from '../../services/manaStats';

const MiniCurve = ({ curve }: { curve: ColorCurve }) => {
  const { t } = useTranslation();
  const max = Math.max(1, ...curve.buckets);
  const empty = curve.total === 0;
  return (
    <div className={`mini-curve${empty ? ' is-empty' : ''}`}>
      <div className="mini-curve__head">
        <ManaSymbol token={curve.color} size={18} />
        <span className="mini-curve__name">{t(`stats.color_${curve.color}`, curve.name)}</span>
        <span className="mini-curve__total text-muted">{curve.total}</span>
      </div>
      <div className="mini-curve__bars">
        {curve.buckets.map((count, i) => (
          <div key={CURVE_BUCKETS[i]} className="mini-curve__col" title={`${CURVE_BUCKETS[i]}: ${count}`}>
            <span className="mini-curve__count">{count > 0 ? count : ''}</span>
            <span
              className="mini-curve__bar"
              style={{ height: `${(count / max) * 100}%`, background: PIP_COLOR_HEX[curve.color] }}
            />
            <span className="mini-curve__x">{CURVE_BUCKETS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** #6 — A small dedicated mana curve per colour, all six always shown. */
export const ColorCurves = ({ cards }: { cards: DeckCard[] }) => {
  const curves = useMemo(() => colorCurves(cards), [cards]);
  return (
    <div className="mini-curves">
      {curves.map((curve) => (
        <MiniCurve key={curve.color} curve={curve} />
      ))}
    </div>
  );
};
