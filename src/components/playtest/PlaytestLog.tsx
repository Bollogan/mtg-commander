import { useTranslation } from 'react-i18next';
import type { LogEntry } from '../../features/playtest/playtestEngine';

/** English fallbacks, so a log line still reads sensibly before its translation exists. */
const DEFAULTS: Record<string, string> = {
  newGame: 'New game (seed {{seed}})',
  mulligan: 'Mulligan to {{count}}',
  keep: 'Kept {{handSize}} cards ({{bottomed}} to the bottom)',
  turn: 'Turn {{turn}}',
  draw: 'Drew {{count}}',
  libraryEmpty: 'Library is empty',
  mill: 'Milled {{count}}',
  move: '{{name}}: {{from}} → {{to}}',
  untapAll: 'Untapped everything',
  shuffle: 'Shuffled library',
  life: 'Life is now {{life}}',
};

/** Reverse-chronological game log, the playtester's record of what actually happened. */
export function PlaytestLog({ entries }: { entries: LogEntry[] }) {
  const { t } = useTranslation();

  const zoneName = (zone: string) => t(`playtest.zone.${zone}`, zone);

  return (
    <ol className="pt-log">
      {[...entries].reverse().map((entry) => {
        const params = { ...entry.params };
        if (typeof params.from === 'string') params.from = zoneName(params.from);
        if (typeof params.to === 'string') params.to = zoneName(params.to);
        return (
          <li key={entry.id} className={`pt-log__row pt-log__row--${entry.key}`}>
            <span className="pt-log__turn">{entry.turn > 0 ? `T${entry.turn}` : '—'}</span>
            <span>{t(`playtest.log.${entry.key}`, DEFAULTS[entry.key] ?? entry.key, params)}</span>
          </li>
        );
      })}
    </ol>
  );
}
