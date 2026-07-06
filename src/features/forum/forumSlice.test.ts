import { describe, it, expect } from 'vitest';
import reducer, {
  clearSearch,
  setStreamConnected,
  forumEventReceived,
  forumVoteUpdated,
  createThread,
  fetchRails,
  searchForums,
  voteForum,
  fetchModerationQueue,
  resolveModeration,
  type Thread,
  type ModerationItem,
  type ForumEvent,
  type SearchResultPage,
  type DiscoveryRails,
} from './forumSlice';

const thread = (over: Partial<Thread>): Thread => ({
  id: over.id ?? 't1',
  title: over.title ?? 'Commander Central',
  description: over.description ?? null,
  category: over.category ?? 'GENERAL',
  slug: over.slug ?? null,
  coverImage: null,
  bannerImage: null,
  language: over.language ?? 'en',
  tags: over.tags ?? [],
  nsfw: false,
  isPrivate: false,
  moderationStatus: over.moderationStatus ?? 'APPROVED',
  authorId: over.authorId ?? 'u1',
  authorName: over.authorName ?? 'Alice',
  postCount: over.postCount ?? 0,
  replyCount: 0,
  memberCount: over.memberCount ?? 1,
  weeklyActivityScore: over.weeklyActivityScore ?? 0,
  upvotes: over.upvotes ?? 0,
  downvotes: over.downvotes ?? 0,
  score: over.score ?? 0,
  myVote: over.myVote ?? 0,
  lastActivityAt: over.lastActivityAt ?? '2026-07-01T00:00:00Z',
  createdAt: over.createdAt ?? '2026-07-01T00:00:00Z',
});

const item = (id: string): ModerationItem => ({
  id,
  type: 'POST',
  forumId: 'f1',
  postId: null,
  title: 'Held topic',
  excerpt: 'text',
  authorId: 'u2',
  authorName: 'Bob',
  moderationStatus: 'PENDING',
  flags: [],
  rejectionReason: null,
  createdAt: '2026-07-05T00:00:00Z',
});

const event = (type: string): ForumEvent => ({
  type, forumId: 'f1', postId: 'p1', actorId: 'u2', actorName: 'Bob',
  title: null, message: null, at: '2026-07-06T00:00:00Z',
});

describe('forumSlice reducers', () => {
  it('setStreamConnected toggles the live flag', () => {
    const s = reducer(undefined, setStreamConnected(true));
    expect(s.streamConnected).toBe(true);
  });

  it('forumEventReceived bumps moderationSignal only for moderation events', () => {
    let s = reducer(undefined, forumEventReceived(event('CONTENT_FLAGGED')));
    expect(s.moderationSignal).toBe(1);
    expect(s.lastEventType).toBe('CONTENT_FLAGGED');

    s = reducer(s, forumEventReceived(event('CONTENT_RESOLVED')));
    expect(s.moderationSignal).toBe(2);

    // A non-moderation event updates lastEventType but not the signal.
    s = reducer(s, forumEventReceived(event('NEW_POST')));
    expect(s.moderationSignal).toBe(2);
    expect(s.lastEventType).toBe('NEW_POST');
  });

  it('clearSearch resets search results', () => {
    const page: SearchResultPage = { items: [thread({})], total: 1, page: 0, size: 12, hasMore: false };
    let s = reducer(undefined, searchForums.fulfilled(page, 'r', {}));
    expect(s.search?.total).toBe(1);
    expect(s.searchStatus).toBe('succeeded');
    s = reducer(s, clearSearch());
    expect(s.search).toBeNull();
    expect(s.searchStatus).toBe('idle');
  });

  it('createThread.fulfilled prepends the new forum', () => {
    const first = reducer(undefined, createThread.fulfilled(thread({ id: 'a' }), 'r', { title: 'x' }));
    const second = reducer(first, createThread.fulfilled(thread({ id: 'b' }), 'r', { title: 'y' }));
    expect(second.threads.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('fetchRails.fulfilled stores the three rails', () => {
    const rails: DiscoveryRails = { trending: [thread({ id: 'x' })], rising: [], newest: [] };
    const s = reducer(undefined, fetchRails.fulfilled(rails, 'r', 12));
    expect(s.rails?.trending).toHaveLength(1);
    expect(s.railsStatus).toBe('succeeded');
  });

  it('voteForum.fulfilled updates the forum tallies wherever it is cached', () => {
    const rails: DiscoveryRails = { trending: [thread({ id: 'x' })], rising: [], newest: [] };
    let s = reducer(undefined, fetchRails.fulfilled(rails, 'r', 12));
    s = reducer(s, voteForum.fulfilled(
      { forumId: 'x', result: { upvotes: 5, downvotes: 1, score: 4, myVote: 1 } },
      'r', { forumId: 'x', value: 1 }));
    expect(s.rails?.trending[0]).toMatchObject({ upvotes: 5, downvotes: 1, score: 4, myVote: 1 });
  });

  it('forumVoteUpdated applies realtime tallies without touching myVote', () => {
    const rails: DiscoveryRails = { trending: [thread({ id: 'x', myVote: 1 })], rising: [], newest: [] };
    let s = reducer(undefined, fetchRails.fulfilled(rails, 'r', 12));
    s = reducer(s, forumVoteUpdated({ forumId: 'x', upvotes: 9, downvotes: 2, score: 7 }));
    expect(s.rails?.trending[0]).toMatchObject({ upvotes: 9, downvotes: 2, score: 7, myVote: 1 });
  });

  it('resolveModeration.fulfilled removes the resolved item from the queue', () => {
    let s = reducer(undefined, fetchModerationQueue.fulfilled([item('i1'), item('i2')], 'r', { forumId: 'f1' }));
    expect(s.moderationQueue).toHaveLength(2);
    s = reducer(s, resolveModeration.fulfilled(
      { id: 'i1' }, 'r', { forumId: 'f1', kind: 'posts', id: 'i1', action: 'approve' }));
    expect(s.moderationQueue.map((i) => i.id)).toEqual(['i2']);
  });
});
