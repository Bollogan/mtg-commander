import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchProfile } from '../../features/profile/profileSlice';
import { FollowButton } from './FollowButton';

/** Public profile page: identity, follower stats, earned badges, and a follow toggle. */
export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((s) => s.profile.current);
  const badges = useAppSelector((s) => s.profile.badges);
  const status = useAppSelector((s) => s.profile.status);

  useEffect(() => {
    if (id) dispatch(fetchProfile(id));
  }, [dispatch, id]);

  if (status === 'loading') {
    return (
      <Container className="page-container text-center">
        <Spinner animation="border" />
      </Container>
    );
  }
  if (!profile) {
    return (
      <Container className="page-container">
        <div className="grid-empty">
          <span className="grid-empty__glyph" aria-hidden="true">✦</span>
          <p className="mb-0">We couldn&apos;t find that profile.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="page-container content-narrow">
      <motion.section
        className="deck-card profile-head"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="profile-id">
          {profile.avatarUrl ? (
            <img className="profile-avatar" src={profile.avatarUrl} alt={profile.displayName} />
          ) : (
            <div className="profile-avatar--fallback" aria-hidden="true">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-grow-1">
            <h1 className="profile-name">{profile.displayName}</h1>
            {profile.country && <span className="profile-meta">{profile.country}</span>}
          </div>
          <FollowButton userId={profile.id} />
        </div>

        {profile.bio && <p className="profile-bio">{profile.bio}</p>}

        <div className="stat-group">
          <div className="stat">
            <span className="stat__num">{profile.followerCount}</span>
            <span className="stat__label">Followers</span>
          </div>
          <div className="stat">
            <span className="stat__num">{profile.followingCount}</span>
            <span className="stat__label">Following</span>
          </div>
          <div className="stat">
            <span className="stat__num">{profile.deckCount}</span>
            <span className="stat__label">Decks</span>
          </div>
        </div>
      </motion.section>

      <h2 className="section-title">Badges</h2>
      {badges.length === 0 ? (
        <p className="text-muted">No badges earned yet.</p>
      ) : (
        <div className="d-flex flex-wrap gap-2">
          {badges.map((b) => (
            <span key={b.type} className="badge-soft" title={b.description}>
              {b.label}
            </span>
          ))}
        </div>
      )}
    </Container>
  );
}
