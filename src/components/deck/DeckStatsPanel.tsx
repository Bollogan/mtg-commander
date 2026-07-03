import { useMemo } from 'react';
import { Card, Stack } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { DeckCard, DeckCategory, DeckStats } from '../../features/deck/deckSlice';
import { ManaChart } from './ManaChart';
import { ColorPipStats } from './ColorPipStats';
import { ColorCurves } from './ColorCurves';
import { DrawCalculator } from './DrawCalculator';
import { BracketPanel } from './BracketPanel';

interface DeckStatsPanelProps {
  cards: DeckCard[];
  categories?: DeckCategory[];
  stats?: DeckStats | null;
}

export const DeckStatsPanel = ({ cards, categories = [], stats }: DeckStatsPanelProps) => {
  const { t } = useTranslation();

  const totalCards = stats?.totalCards ?? cards.reduce((sum, c) => sum + c.qty, 0);

  const { avgCmc, totalMv } = useMemo(() => {
    const nonLand = cards.filter((c) => !(c.typeLine ?? '').toLowerCase().includes('land'));
    const copies = nonLand.reduce((sum, c) => sum + c.qty, 0);
    const total = nonLand.reduce((sum, c) => sum + (c.cmc ?? 0) * c.qty, 0);
    return { avgCmc: copies === 0 ? 0 : total / copies, totalMv: total };
  }, [cards]);

  return (
    <Card className="deck-card mb-3">
      <Card.Body>
        <Card.Title>{t('builder.stats', 'Statistics')}</Card.Title>

        <Stack direction="horizontal" gap={3} className="mb-3 flex-wrap">
          <div className="stat-pill">
            <span className="stat-pill__num">{totalCards}</span>
            <span className="stat-pill__label">{t('builder.cards', 'Cards')}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill__num">{avgCmc.toFixed(2)}</span>
            <span className="stat-pill__label">{t('builder.avgCmc', 'Avg MV')}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill__num">{totalMv.toFixed(0)}</span>
            <span className="stat-pill__label">{t('stats.totalMv', 'Total MV')}</span>
          </div>
        </Stack>

        {totalCards > 0 && (
          <>
            <section className="stats-section">
              <div className="stats-section__title">{t('stats.bracket', 'Estimated bracket')}</div>
              <BracketPanel cards={cards} />
            </section>

            <section className="stats-section">
              <div className="stats-section__title">{t('stats.pipsByColor', 'Mana pips by colour')}</div>
              <ColorPipStats cards={cards} />
            </section>

            <section className="stats-section">
              <div className="stats-section__title">{t('builder.manaCurve', 'Mana curve')}</div>
              <ManaChart cards={cards} />
            </section>

            <section className="stats-section">
              <div className="stats-section__title">{t('stats.curveByColor', 'Mana curve by colour')}</div>
              <ColorCurves cards={cards} />
            </section>

            <section className="stats-section">
              <div className="stats-section__title">{t('stats.drawCalculator', 'Chance to draw')}</div>
              <DrawCalculator cards={cards} categories={categories} />
            </section>
          </>
        )}
      </Card.Body>
    </Card>
  );
};
