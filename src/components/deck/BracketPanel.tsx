import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DeckCard } from '../../features/deck/deckSlice';
import { BRACKET_LABELS, estimateBracket } from '../../services/bracket';

const REASON_TEXT: Record<string, string> = {
  gameChangers: 'Game Changers',
  combos: 'Two-card infinite combos',
  massLandDenial: 'Mass land denial',
  extraTurns: 'Extra-turn spells',
  tutors: 'Efficient tutors',
  clean: 'No high-power staples detected — plays as a casual deck.',
};

export const BracketPanel = ({ cards }: { cards: DeckCard[] }) => {
  const { t } = useTranslation();
  const result = useMemo(() => estimateBracket(cards), [cards]);
  if (!result) return null;

  return (
    <div className="bracket">
      <div className="bracket__head">
        <div className="bracket__badge" data-bracket={result.bracket}>
          <span className="bracket__num">{result.bracket}</span>
          <span className="bracket__label">{BRACKET_LABELS[result.bracket]}</span>
        </div>
        <div className="bracket__scale" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`bracket__tick${n === result.bracket ? ' is-active' : ''}${n < result.bracket ? ' is-filled' : ''}`}>
              {n}
            </span>
          ))}
        </div>
      </div>

      <ul className="bracket__reasons">
        {result.reasons.map((r) => (
          <li key={r.code} className={`bracket__reason bracket__reason--${r.code}`}>
            <span className="bracket__reason-label">{t(`bracket.reason.${r.code}`, REASON_TEXT[r.code] ?? r.code)}</span>
            {r.cards && r.cards.length > 0 && (
              <span className="bracket__chips">
                {r.cards.map((c) => <span key={c} className="bracket__chip">{c}</span>)}
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="bracket__note text-muted">
        {t('bracket.note', 'Local estimate based on the official Commander Brackets criteria. cEDH (5) is a metagame call and is not auto-detected.')}
      </p>
    </div>
  );
};
