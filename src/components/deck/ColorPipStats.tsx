import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DeckCard } from '../../features/deck/deckSlice';
import { ManaSymbol } from '../ManaCost';
import {
  costPipStats, productionPipStats, PIP_COLORS, PIP_COLOR_HEX, COLORED_PIPS,
  type ColorPipStat,
} from '../../services/manaStats';

/** The wide proportional bar at the top (share of each colour among all coloured pips). */
const ProportionBar = ({ stats }: { stats: ColorPipStat[] }) => {
  const total = COLORED_PIPS.reduce((sum, c) => {
    const s = stats.find((x) => x.color === c);
    return sum + (s?.pips ?? 0);
  }, 0);
  return (
    <div className="pip-bar" role="img">
      {total === 0 ? (
        <div className="pip-bar__empty" />
      ) : (
        COLORED_PIPS.map((color) => {
          const s = stats.find((x) => x.color === color);
          const pct = s ? (s.pips / total) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <span
              key={color}
              className="pip-bar__seg"
              style={{ width: `${pct}%`, background: PIP_COLOR_HEX[color] }}
              title={`${s?.name}: ${Math.round(pct)}%`}
            />
          );
        })
      )}
    </div>
  );
};

const ColorCard = ({ cost, prod }: { cost: ColorPipStat; prod: ColorPipStat }) => {
  const { t } = useTranslation();
  const active = cost.pips > 0 || prod.pips > 0;
  return (
    <div className={`pip-card${active ? ' is-active' : ''}`}>
      <div className="pip-card__head"><ManaSymbol token={cost.color} size={26} /></div>

      <div className="pip-card__row">
        <span className="pip-card__label">{t('stats.cost', 'Cost')}</span>
        <div className="pip-meter">
          <span className="pip-meter__fill" style={{ width: `${cost.costPct}%`, background: PIP_COLOR_HEX[cost.color] }} />
          <span className="pip-meter__pct">{Math.round(cost.costPct)}%</span>
        </div>
        <span className="pip-card__sub">{cost.pips} {t('stats.pips', 'pips')} · {cost.cards} {t('stats.cards', 'cards')}</span>
      </div>

      <div className="pip-card__row">
        <span className="pip-card__label">{t('stats.production', 'Production')}</span>
        <div className="pip-meter">
          <span className="pip-meter__fill" style={{ width: `${prod.costPct}%`, background: PIP_COLOR_HEX[prod.color] }} />
          <span className="pip-meter__pct">{Math.round(prod.costPct)}%</span>
        </div>
        <span className="pip-card__sub">{prod.pips} {t('stats.mana', 'mana')} · {prod.cards} {t('stats.cards', 'cards')}</span>
      </div>
    </div>
  );
};

/** #5 — Percentage of cards with coloured mana pips per colour (cost + production). */
export const ColorPipStats = ({ cards }: { cards: DeckCard[] }) => {
  const { t } = useTranslation();
  const cost = useMemo(() => costPipStats(cards), [cards]);
  const prod = useMemo(() => productionPipStats(cards), [cards]);

  return (
    <div className="pip-stats">
      <div className="pip-stats__bars">
        <div>
          <div className="small text-muted mb-1">{t('stats.cost', 'Cost')}</div>
          <ProportionBar stats={cost} />
        </div>
        <div>
          <div className="small text-muted mb-1">{t('stats.production', 'Production')}</div>
          <ProportionBar stats={prod} />
        </div>
      </div>

      <div className="pip-cards">
        {PIP_COLORS.map((color) => (
          <ColorCard
            key={color}
            cost={cost.find((s) => s.color === color)!}
            prod={prod.find((s) => s.color === color)!}
          />
        ))}
      </div>
    </div>
  );
};
