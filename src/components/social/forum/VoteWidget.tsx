import { useTranslation } from 'react-i18next';

interface Props {
  score: number;
  /** The current user's vote: 1 (up), -1 (down) or 0 (none). */
  myVote: number;
  /** Called with the intended value; the parent toggles (clicking an active arrow clears it). */
  onVote: (value: number) => void;
  disabled?: boolean;
  /** Compact layout for dense lists (post cards); default is the roomy detail-page layout. */
  size?: 'sm' | 'md';
  orientation?: 'vertical' | 'horizontal';
}

/**
 * Reddit-style up/down control with a net score. Clicking an already-active arrow clears the vote
 * (sends 0); otherwise it sets +1/-1. Shared by post cards, the post page and every comment.
 */
export function VoteWidget({
  score, myVote, onVote, disabled = false, size = 'md', orientation = 'vertical',
}: Props) {
  const { t } = useTranslation();
  const cast = (value: number) => {
    if (disabled) return;
    onVote(myVote === value ? 0 : value);
  };
  return (
    <div className={`vote-widget vote-widget--${orientation} vote-widget--${size}`}>
      <button
        type="button"
        className={`vote-btn vote-btn--up${myVote === 1 ? ' is-active' : ''}`}
        onClick={() => cast(1)}
        disabled={disabled}
        aria-pressed={myVote === 1}
        aria-label={t('forums.upvote', 'Upvote')}
        title={disabled ? t('forums.voteSignedOut', 'Sign in to vote') : t('forums.upvote', 'Upvote')}
      >
        ▲
      </button>
      <span className={`vote-score${score > 0 ? ' is-pos' : score < 0 ? ' is-neg' : ''}`}>
        {score}
      </span>
      <button
        type="button"
        className={`vote-btn vote-btn--down${myVote === -1 ? ' is-active' : ''}`}
        onClick={() => cast(-1)}
        disabled={disabled}
        aria-pressed={myVote === -1}
        aria-label={t('forums.downvote', 'Downvote')}
        title={disabled ? t('forums.voteSignedOut', 'Sign in to vote') : t('forums.downvote', 'Downvote')}
      >
        ▼
      </button>
    </div>
  );
}
