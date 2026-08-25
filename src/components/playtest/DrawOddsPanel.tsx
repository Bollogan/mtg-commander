import { useMemo, useState } from 'react';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  formatPercent,
  oddsByTurn,
  openingHandDistribution,
  openingHandInRange,
} from '../../features/playtest/drawOdds';
import type { PlaytestCard } from '../../features/playtest/playtestEngine';

interface Props {
  /** Everything that started in the library — the population the odds are computed against. */
  deckPool: PlaytestCard[];
  /** Cards in the current opening hand (7 minus the mulligan tax). */
  handSize: number;
  onThePlay: boolean;
  cardsDrawn: number;
  landsDrawn: number;
}

const TYPE_BUCKETS = ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker'];

const frontType = (typeLine: string | null): string => (typeLine ?? '').split('//')[0];

/**
 * The deck's draw probabilities — the reason to open a playtester before a game rather than
 * during one. Every number is exact (hypergeometric), not simulated.
 */
export function DrawOddsPanel({ deckPool, handSize, onThePlay, cardsDrawn, landsDrawn }: Props) {
  const { t } = useTranslation();
  const [target, setTarget] = useState('lands');
  const [atLeast, setAtLeast] = useState(1);

  const deckSize = deckPool.length;

  const options = useMemo(() => {
    const byName = new Map<string, number>();
    for (const card of deckPool) {
      byName.set(card.name, (byName.get(card.name) ?? 0) + 1);
    }
    const types = TYPE_BUCKETS
      .map((type) => ({
        value: `type:${type}`,
        label: type,
        count: deckPool.filter((c) => !c.isLand && frontType(c.typeLine).includes(type)).length,
      }))
      .filter((o) => o.count > 0);

    const cards = [...byName.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ value: `card:${name}`, label: name, count }));

    return { types, cards };
  }, [deckPool]);

  const copies = useMemo(() => {
    if (target === 'lands') return deckPool.filter((c) => c.isLand).length;
    if (target === 'nonlands') return deckPool.filter((c) => !c.isLand).length;
    if (target.startsWith('type:')) {
      const type = target.slice(5);
      return deckPool.filter((c) => !c.isLand && frontType(c.typeLine).includes(type)).length;
    }
    const name = target.slice(5);
    return deckPool.filter((c) => c.name === name).length;
  }, [deckPool, target]);

  const rows = useMemo(
    () => oddsByTurn({ deckSize, copies, handSize, onThePlay, atLeast, maxTurn: 10 }),
    [atLeast, copies, deckSize, handSize, onThePlay],
  );

  const distribution = useMemo(
    () => openingHandDistribution(deckSize, copies, handSize),
    [copies, deckSize, handSize],
  );

  const keepable = useMemo(
    () => openingHandInRange(deckSize, copies, 2, 5, handSize),
    [copies, deckSize, handSize],
  );

  const maxCopies = Math.min(copies, handSize);
  const drawnRatio = cardsDrawn > 0 ? landsDrawn / cardsDrawn : 0;
  const deckLandRatio = deckSize > 0 ? deckPool.filter((c) => c.isLand).length / deckSize : 0;

  if (deckSize === 0) {
    return <p className="text-muted small mb-0">{t('playtest.oddsNoDeck', 'Add cards to the deck to see draw odds.')}</p>;
  }

  return (
    <div className="pt-odds">
      <div className="pt-odds__controls">
        <Form.Group controlId="pt-odds-target">
          <Form.Label className="small text-muted mb-1">{t('playtest.oddsTarget', 'Looking for')}</Form.Label>
          <Form.Select size="sm" value={target} onChange={(e) => { setTarget(e.target.value); setAtLeast(1); }}>
            <optgroup label={t('playtest.oddsGroups', 'Groups')}>
              <option value="lands">
                {t('playtest.lands', 'Lands')} ({deckPool.filter((c) => c.isLand).length})
              </option>
              <option value="nonlands">
                {t('playtest.spells', 'Spells')} ({deckPool.filter((c) => !c.isLand).length})
              </option>
              {options.types.map((o) => (
                <option key={o.value} value={o.value}>{o.label} ({o.count})</option>
              ))}
            </optgroup>
            <optgroup label={t('playtest.oddsCards', 'Individual cards')}>
              {options.cards.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}{o.count > 1 ? ` ×${o.count}` : ''}
                </option>
              ))}
            </optgroup>
          </Form.Select>
        </Form.Group>

        <Form.Group controlId="pt-odds-atleast">
          <Form.Label className="small text-muted mb-1">{t('playtest.oddsAtLeast', 'At least')}</Form.Label>
          <Form.Control
            size="sm"
            type="number"
            min={1}
            max={Math.max(1, maxCopies)}
            value={atLeast}
            onChange={(e) => setAtLeast(Math.max(1, Math.min(Number(e.target.value) || 1, Math.max(1, maxCopies))))}
          />
        </Form.Group>
      </div>

      <p className="text-muted small mt-2 mb-2">
        {t('playtest.oddsContext', '{{copies}} of {{deckSize}} cards · opening hand of {{handSize}} · {{play}}', {
          copies,
          deckSize,
          handSize,
          play: onThePlay ? t('playtest.onThePlay', 'on the play') : t('playtest.onTheDraw', 'on the draw'),
        })}
      </p>

      <table className="pt-odds__table">
        <thead>
          <tr>
            <th>{t('playtest.turn', 'Turn')}</th>
            <th>{t('playtest.seen', 'Seen')}</th>
            <th>{t('playtest.chance', 'Chance')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.turn}>
              <td className="tabular-nums">{row.turn}</td>
              <td className="tabular-nums text-muted">{row.seen}</td>
              <td>
                <span className="pt-odds__bar" style={{ '--p': `${row.probability * 100}%` } as React.CSSProperties}>
                  <span className="tabular-nums">{formatPercent(row.probability)}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h6 className="small text-muted mt-3 mb-1">
        {t('playtest.oddsOpeningHand', 'In the opening hand')}
      </h6>
      <ul className="pt-odds__dist">
        {distribution.map((entry) => (
          <li key={entry.count}>
            <span className="tabular-nums">{entry.count}</span>
            <span className="pt-odds__bar pt-odds__bar--thin"
              style={{ '--p': `${entry.probability * 100}%` } as React.CSSProperties} />
            <span className="tabular-nums text-muted">{formatPercent(entry.probability)}</span>
          </li>
        ))}
      </ul>
      {target === 'lands' && (
        <p className="small text-muted mb-0">
          {t('playtest.oddsKeepable', '{{percent}} of opening hands hold 2–5 lands.', {
            percent: formatPercent(keepable),
          })}
        </p>
      )}

      <h6 className="small text-muted mt-3 mb-1">{t('playtest.thisGame', 'This game')}</h6>
      <p className="small mb-0">
        {t('playtest.thisGameDrawn', '{{cards}} cards drawn · {{lands}} lands ({{ratio}})', {
          cards: cardsDrawn,
          lands: landsDrawn,
          ratio: formatPercent(drawnRatio, 0),
        })}
        <br />
        <span className="text-muted">
          {t('playtest.thisGameExpected', 'Deck runs {{ratio}} lands.', {
            ratio: formatPercent(deckLandRatio, 0),
          })}
        </span>
      </p>
    </div>
  );
}
