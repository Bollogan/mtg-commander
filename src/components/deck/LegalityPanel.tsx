import { useTranslation } from 'react-i18next';
import type { LegalityReport, Violation } from '../../data/formats';

const VIOLATION_LABEL: Record<Violation['type'], string> = {
  SIZE: 'builder.viol_size',
  COPIES: 'builder.viol_copies',
  BANNED: 'builder.viol_banned',
  RESTRICTED: 'builder.viol_restricted',
  NOT_LEGAL: 'builder.viol_not_legal',
  COLOR_IDENTITY: 'builder.viol_identity',
  RARITY: 'builder.viol_rarity',
  COMMANDER: 'builder.viol_commander',
};

export const LegalityPanel = ({ report }: { report: LegalityReport }) => {
  const { t } = useTranslation();
  const target = report.maxDeckSize ?? report.minDeckSize;
  const pct = target > 0 ? Math.min(100, Math.round((report.deckSize / target) * 100)) : 0;

  return (
    <div className="legality-panel">
      <div className="legality-panel__head">
        <span className="legality-panel__format">{report.label}</span>
        <span className={`legality-badge ${report.legal ? 'is-legal' : 'is-illegal'}`}>
          {report.legal ? t('builder.legal') : t('builder.illegal')}
        </span>
      </div>

      <div className="legality-panel__count">
        <span className="tabular-nums">
          {report.deckSize}
          {report.maxDeckSize
            ? ` / ${report.maxDeckSize}`
            : ` / ${report.minDeckSize}+`}
        </span>
        <span className="text-muted small">{t('builder.cards')}</span>
      </div>
      <div className="legality-bar">
        <div className="legality-bar__fill" style={{ width: `${pct}%` }} />
      </div>

      {report.violations.length === 0 ? (
        <p className="legality-panel__ok">✦ {t('builder.no_issues')}</p>
      ) : (
        <ul className="legality-list">
          {report.violations.map((v, i) => (
            <li key={i} className="legality-item">
              <span className="legality-item__tag">{t(VIOLATION_LABEL[v.type])}</span>
              <span className="legality-item__text">
                {v.cardName ? <strong>{v.cardName}</strong> : null} {v.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
