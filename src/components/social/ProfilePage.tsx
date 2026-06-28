import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

  if (status === 'loading') return <div className="container py-4">Loading profile…</div>;
  if (!profile) return <div className="container py-4">Profile not found.</div>;

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center gap-3 mb-3">
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.displayName} width={72} height={72}
               className="rounded-circle" />
        ) : (
          <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
               style={{ width: 72, height: 72, color: 'white', fontSize: 28 }}>
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-grow-1">
          <h3 className="mb-0">{profile.displayName}</h3>
          {profile.country && <small className="text-muted">{profile.country}</small>}
        </div>
        <FollowButton userId={profile.id} />
      </div>

      {profile.bio && <p>{profile.bio}</p>}

      <div className="d-flex gap-4 mb-4">
        <div><strong>{profile.followerCount}</strong> followers</div>
        <div><strong>{profile.followingCount}</strong> following</div>
        <div><strong>{profile.deckCount}</strong> decks</div>
      </div>

      <h5>Badges</h5>
      {badges.length === 0 ? (
        <p className="text-muted">No badges yet.</p>
      ) : (
        <div className="d-flex flex-wrap gap-2">
          {badges.map((b) => (
            <span key={b.type} className="badge bg-info text-dark" title={b.description}>
              {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
