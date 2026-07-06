import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { reportContent } from '../../../features/forum/forumSlice';

interface Props {
  forumId: string;
  kind: 'posts' | 'comments';
  id: string;
}

/** Flags a post/comment for moderator review, with an optional reason. Any signed-in user can report. */
export function ReportButton({ forumId, kind, id }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);

  if (!isAuthenticated) return null;
  if (done) return <span className="report-done">{t('forums.reported', 'Reported ✓')}</span>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(reportContent({ forumId, kind, id, reason: reason.trim() || undefined }));
    setDone(true);
    setOpen(false);
  };

  return (
    <span className="report">
      {!open ? (
        <button type="button" className="report__trigger" onClick={() => setOpen(true)}>
          ⚐ {t('forums.report', 'Report')}
        </button>
      ) : (
        <form className="report__form" onSubmit={submit}>
          <input
            className="form-control form-control-sm"
            placeholder={t('forums.reportReason', 'Reason (optional)')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-sm btn-danger">{t('forums.report', 'Report')}</button>
          <button type="button" className="btn btn-sm btn-link" onClick={() => setOpen(false)}>
            {t('common.cancel', 'Cancel')}
          </button>
        </form>
      )}
    </span>
  );
}
