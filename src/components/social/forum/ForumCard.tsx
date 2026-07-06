import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { voteForum, type Thread } from '../../../features/forum/forumSlice';
import { VoteWidget } from './VoteWidget';

/** Maps a forum category to one of Magic's mana accents (spec §6 "Mana Gradient"). */
const CATEGORY_ACCENT: Record<string, string> = {
  GENERAL: 'var(--accent)',
  DECK_DISCUSSION: '#4a7fd8',   // blue
  RULES: '#d8a24a',            // gold
  TRADE: '#4ad88a',            // green
  LORE: '#a24ad8',             // purple
  CUSTOM: '#d84a6b',           // red
};

function accentFor(category: string | null): string {
  return CATEGORY_ACCENT[category ?? 'GENERAL'] ?? 'var(--accent)';
}

/** Buckets the weekly activity score into a pulse intensity for the "activity pulse" dot. */
function pulseLevel(score: number): 'hot' | 'warm' | 'idle' {
  if (score >= 50) return 'hot';
  if (score >= 10) return 'warm';
  return 'idle';
}

interface Props {
  forum: Thread;
  /** Compact variant used inside horizontal rails. */
  compact?: boolean;
}

/**
 * A premium forum tile: a stacked-card surface (spec §6 "El Stack de Magic") with a category-tinted
 * glow, an activity-pulse indicator and stat chips that surface on hover.
 */
export function ForumCard({ forum, compact = false }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));
  const accent = accentFor(forum.category);
  const pulse = pulseLevel(forum.weeklyActivityScore);
  const to = `/forums/${forum.id}`;

  // The card is a <Link>; keep vote clicks from navigating and let the parent toggle handle the value.
  const handleVote = (value: number) => {
    if (!isAuthenticated) return;
    dispatch(voteForum({ forumId: forum.id, value }));
  };

  return (
    <Link
      to={to}
      className={`forum-card${compact ? ' forum-card--compact' : ''}`}
      style={{ ['--forum-accent' as string]: accent }}
    >
      {forum.coverImage && (
        <div className="forum-card__cover" style={{ backgroundImage: `url(${forum.coverImage})` }} />
      )}
      <div className="forum-card__body">
        <div className="forum-card__top">
          <span className="forum-card__category">{t(`forums.category.${forum.category ?? 'GENERAL'}`, forum.category ?? 'General')}</span>
          <span className={`activity-pulse activity-pulse--${pulse}`} title={t('forums.activityScore', 'Activity')}>
            <span className="activity-pulse__dot" />
            {forum.weeklyActivityScore}
          </span>
        </div>

        <h3 className="forum-card__title">
          {forum.title}
          {forum.nsfw && <span className="forum-card__nsfw" title="NSFW">18+</span>}
          {forum.moderationStatus === 'PENDING' && (
            <span className="badge-pending" title={t('forums.pendingReview', 'Pending review')}>⏳</span>
          )}
        </h3>

        {forum.description && !compact && (
          <p className="forum-card__desc">{forum.description}</p>
        )}

        {forum.tags.length > 0 && !compact && (
          <div className="forum-card__tags">
            {forum.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="forum-tag">#{tag}</span>
            ))}
          </div>
        )}

        <div className="forum-card__stats">
          <span
            className="forum-card__vote"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            role="presentation"
          >
            <VoteWidget
              score={forum.score}
              myVote={forum.myVote}
              onVote={handleVote}
              disabled={!isAuthenticated}
              size="sm"
              orientation="horizontal"
            />
          </span>
          <span className="forum-stat" title={t('forums.members', 'Members')}>
            <span aria-hidden="true">👥</span> {forum.memberCount}
          </span>
          <span className="forum-stat" title={t('forums.topics', 'Topics')}>
            <span aria-hidden="true">💬</span> {forum.postCount}
          </span>
          <span className="forum-stat forum-stat--by">
            {t('forums.by', 'by')} {forum.authorName}
          </span>
        </div>
      </div>
    </Link>
  );
}
