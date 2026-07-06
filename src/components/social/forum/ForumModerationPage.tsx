import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import {
  fetchModerationQueue,
  fetchModerationStats,
  fetchMyPermissions,
  resolveModeration,
  type ModerationItem,
} from '../../../features/forum/forumSlice';
import { useForumStream } from '../../../features/forum/useForumStream';

type StatusTab = 'PENDING' | 'REJECTED' | 'APPROVED';

/** The per-forum moderation dashboard (spec §5.4): review the queue and approve/reject held content. */
export function ForumModerationPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const queue = useAppSelector((s) => s.forum.moderationQueue);
  const stats = useAppSelector((s) => s.forum.moderationStats);
  const perms = useAppSelector((s) => (id ? s.forum.permissions[id] : undefined));
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));
  const moderationSignal = useAppSelector((s) => s.forum.moderationSignal);

  const [tab, setTab] = useState<StatusTab>('PENDING');

  useDocumentTitle(t('moderation.title', 'Moderation queue'));
  // Realtime: CONTENT_FLAGGED/RESOLVED bump moderationSignal so the queue refreshes live.
  useForumStream(id);

  useEffect(() => {
    if (!id) return;
    if (isAuthenticated) dispatch(fetchMyPermissions(id));
    dispatch(fetchModerationStats(id));
  }, [dispatch, id, isAuthenticated, moderationSignal]);

  useEffect(() => {
    if (id) dispatch(fetchModerationQueue({ forumId: id, status: tab }));
  }, [dispatch, id, tab, moderationSignal]);

  if (!id) return null;

  if (perms && !perms.canModerate) {
    return (
      <Container className="page-container content-narrow">
        <div className="grid-empty">
          <span className="grid-empty__glyph" aria-hidden="true">🛡️</span>
          <p className="mb-0">{t('moderation.forbidden', 'You do not have moderation access to this forum.')}</p>
        </div>
      </Container>
    );
  }

  const act = (item: ModerationItem, action: 'approve' | 'reject') => {
    const kind = item.type === 'POST' ? 'posts' : 'comments';
    const reason = action === 'reject'
      ? window.prompt(t('moderation.rejectReason', 'Reason for rejection (optional):')) ?? undefined
      : undefined;
    dispatch(resolveModeration({ forumId: id, kind, id: item.id, action, reason }))
      .then(() => dispatch(fetchModerationStats(id)));
  };

  const tabs: Array<{ id: StatusTab; label: string; count?: number }> = [
    { id: 'PENDING', label: t('moderation.pending', 'Pending'), count: stats?.pending },
    { id: 'REJECTED', label: t('moderation.rejected', 'Rejected') },
    { id: 'APPROVED', label: t('moderation.approved', 'Approved') },
  ];

  return (
    <Container className="page-container content-narrow">
      <Link to={`/forums/${id}`} className="back-link">← {t('forums.back', 'Back to forums')}</Link>
      <div className="page-header" style={{ textAlign: 'left', margin: '0.5rem 0 1rem' }}>
        <h1 className="h3 mb-1">🛡️ {t('moderation.title', 'Moderation queue')}</h1>
        {stats && (
          <p className="text-muted mb-0">
            {t('moderation.summary', '{{pending}} pending · {{rejected}} rejected',
              { pending: stats.pending, rejected: stats.rejectedPosts + stats.rejectedComments })}
          </p>
        )}
      </div>

      <div className="seg mb-3">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            className={`seg-btn${tab === tb.id ? ' is-active' : ''}`}
            onClick={() => setTab(tb.id)}
          >
            {tb.label}{typeof tb.count === 'number' ? ` (${tb.count})` : ''}
          </button>
        ))}
      </div>

      {queue.length === 0 ? (
        <div className="grid-empty">
          <span className="grid-empty__glyph" aria-hidden="true">✓</span>
          <p className="mb-0">{t('moderation.empty', 'Nothing here. The queue is clear.')}</p>
        </div>
      ) : (
        <div className="mod-queue">
          {queue.map((item) => (
            <article key={item.id} className="mod-item">
              <div className="mod-item__head">
                <span className={`mod-item__type mod-item__type--${item.type.toLowerCase()}`}>
                  {item.type === 'POST' ? t('moderation.topic', 'Topic') : t('moderation.reply', 'Reply')}
                </span>
                <span className="mod-item__time">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              {item.title && <h3 className="mod-item__title">{item.title}</h3>}
              <p className="mod-item__excerpt">{item.excerpt}</p>
              <div className="mod-item__meta">
                <span>{t('forums.by', 'by')} {item.authorName}</span>
                {item.flags && item.flags.length > 0 && (
                  <span className="mod-flags">
                    {item.flags.map((f, i) => (
                      <span key={i} className="mod-flag" title={`${(f.confidence * 100).toFixed(0)}%`}>
                        {f.type}{f.detectedLanguage ? ` · ${f.detectedLanguage}` : ''}
                      </span>
                    ))}
                  </span>
                )}
              </div>
              {item.rejectionReason && (
                <p className="mod-item__reason">{t('moderation.reason', 'Reason')}: {item.rejectionReason}</p>
              )}
              {tab === 'PENDING' && (
                <div className="mod-item__actions">
                  <Button size="sm" variant="success" onClick={() => act(item, 'approve')}>
                    ✓ {t('moderation.approve', 'Approve')}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => act(item, 'reject')}>
                    ✗ {t('moderation.reject', 'Reject')}
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </Container>
  );
}
