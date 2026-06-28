import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFollowStatus, toggleFollow } from '../../features/profile/profileSlice';

interface Props {
  userId: string;
}

/** Follow/unfollow toggle for a profile. Hidden when viewing your own profile. */
export function FollowButton({ userId }: Props) {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((s) => s.auth.userId);
  const following = useAppSelector((s) => s.profile.following);
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));

  useEffect(() => {
    if (isAuthenticated && currentUserId !== userId) {
      dispatch(fetchFollowStatus(userId));
    }
  }, [dispatch, userId, currentUserId, isAuthenticated]);

  if (!isAuthenticated || currentUserId === userId) {
    return null;
  }

  return (
    <button
      type="button"
      className={`btn btn-sm ${following ? 'btn-outline-secondary' : 'btn-primary'}`}
      onClick={() => dispatch(toggleFollow({ id: userId, follow: !following }))}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
