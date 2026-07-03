import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../store/hooks';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const SaveStatus = () => {
  const { t } = useTranslation();
  const { saveStatus } = useAppSelector((s) => s.deck);

  if (saveStatus === 'idle') return null;

  const config: Record<Exclude<SaveStatus, 'idle'>, { className: string; label: string; icon: string }> = {
    saving: { className: 'text-warning', label: t('builder.saving', 'Saving…'), icon: '◌' },
    saved: { className: 'text-success', label: t('builder.saved', 'Saved'), icon: '✓' },
    error: { className: 'text-danger', label: t('builder.saveError', 'Save failed'), icon: '!' },
  };

  const { className, label, icon } = config[saveStatus];

  return (
    <span className={`small d-inline-flex align-items-center gap-1 ${className}`}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
};
