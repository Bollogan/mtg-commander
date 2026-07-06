import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { fetchMyPermissions, fetchPosts, votePost, type Thread } from '../../features/forum/forumSlice';
import { useForumStream } from '../../features/forum/useForumStream';
import { CreatePostModal } from './forum/CreatePostModal';
import { CardText } from './forum/CardText';
import { VoteWidget } from './forum/VoteWidget';

/** A forum board: the list of its topics (Posts), each linking to its own page, plus a New-post CTA. */
export function ForumThread() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const posts = useAppSelector((s) => (id ? s.forum.posts[id] ?? [] : []));
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));
  const perms = useAppSelector((s) => (id ? s.forum.permissions[id] : undefined));
  const streamConnected = useAppSelector((s) => s.forum.streamConnected);
  // Best-effort forum name for the tab title: look it up in any list we've already loaded.
  const forumName = useAppSelector((s) => {
    if (!id) return null;
    const pools: Thread[] = [
      ...s.forum.threads,
      ...(s.forum.rails ? [...s.forum.rails.trending, ...s.forum.rails.rising, ...s.forum.rails.newest] : []),
      ...(s.forum.search?.items ?? []),
    ];
    return pools.find((f) => f.id === id)?.title ?? null;
  });

  const [showCreate, setShowCreate] = useState(false);

  useDocumentTitle(forumName ?? t('forums.title', 'The Forums'));
  useForumStream(id);

  useEffect(() => {
    if (id) {
      dispatch(fetchPosts(id));
      if (isAuthenticated) dispatch(fetchMyPermissions(id));
    }
  }, [dispatch, id, isAuthenticated]);

  if (!id) return null;

  return (
    <Container className="page-container content-narrow">
      <div className="d-flex justify-content-between align-items-center">
        <Link to="/forums" className="back-link">← {t('forums.back', 'Back to forums')}</Link>
        <div className="d-flex align-items-center gap-2">
          {streamConnected && (
            <span className="live-pill" title={t('forums.liveOn', 'Live updates on')}>
              <span className="live-pill__dot" /> {t('forums.live', 'Live')}
            </span>
          )}
          {perms?.canModerate && (
            <Link to={`/forums/${id}/moderate`} className="btn btn-sm btn-outline-secondary">
              🛡️ {t('forums.moderate', 'Moderation')}
            </Link>
          )}
        </div>
      </div>

      <div className="forum-board__bar">
        <h2 className="forum-board__title">{forumName ?? t('forums.title', 'The Forums')}</h2>
        {isAuthenticated && (
          <Button className="forum-hero__cta" size="sm" onClick={() => setShowCreate(true)}>
            + {t('forums.newPost', 'New post')}
          </Button>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="grid-empty">
          <span className="grid-empty__glyph" aria-hidden="true">✦</span>
          <p className="mb-0">{t('forums.noPosts', 'No posts yet. Be the first to write one.')}</p>
        </div>
      ) : (
        <ul className="post-list">
          {posts.map((p) => (
            <li key={p.id} className="deck-card post-row">
              <VoteWidget
                score={p.score}
                myVote={p.myVote}
                disabled={!isAuthenticated}
                onVote={(value) => dispatch(votePost({ postId: p.id, value }))}
              />
              <div className="post-row__main">
                <Link to={`/forums/${id}/posts/${p.id}`} className="post-row__title">
                  <CardText text={p.title} interactive={false} />
                  {p.moderationStatus === 'PENDING' && (
                    <span className="badge-pending" title={t('forums.pendingReview', 'Pending review')}>
                      ⏳ {t('forums.pending', 'Pending')}
                    </span>
                  )}
                </Link>
                <p className="post-row__excerpt"><CardText text={p.excerpt} /></p>
                <div className="post-row__meta">
                  {t('forums.by', 'by')} <Link to={`/users/${p.authorId}`}>{p.authorName}</Link>
                  {' · '}
                  <span>{new Date(p.createdAt).toLocaleString()}</span>
                  {' · '}
                  <Link to={`/forums/${id}/posts/${p.id}`} className="post-row__comments">
                    💬 {p.commentCount} {t('forums.comments', 'comments')}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CreatePostModal threadId={id} show={showCreate} onHide={() => setShowCreate(false)} />
    </Container>
  );
}
