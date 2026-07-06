import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { fetchPost, votePost } from '../../features/forum/forumSlice';
import { CommentList } from './CommentList';
import { CardText } from './forum/CardText';
import { VoteWidget } from './forum/VoteWidget';
import { ReportButton } from './forum/ReportButton';

/** A single forum post on its own page: full body, vote control and the nested comment thread. */
export function PostDetailPage() {
  const { forumId, postId } = useParams<{ forumId: string; postId: string }>();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const post = useAppSelector((s) => (postId ? s.forum.postsById[postId] : undefined));
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));

  useDocumentTitle(post?.title ?? t('forums.title', 'The Forums'));

  useEffect(() => {
    if (postId) dispatch(fetchPost(postId));
  }, [dispatch, postId]);

  const backTo = forumId ? `/forums/${forumId}` : '/forums';

  if (!post) {
    return (
      <Container className="page-container content-narrow">
        <Link to={backTo} className="back-link">← {t('forums.backToForum', 'Back to forum')}</Link>
        <div className="route-fallback" aria-busy="true"><span className="route-spinner" /></div>
      </Container>
    );
  }

  return (
    <Container className="page-container content-narrow">
      <Link to={backTo} className="back-link">← {t('forums.backToForum', 'Back to forum')}</Link>

      <article className="deck-card post-detail">
        <div className="post-detail__head">
          <VoteWidget
            score={post.score}
            myVote={post.myVote}
            disabled={!isAuthenticated}
            onVote={(value) => post && dispatch(votePost({ postId: post.id, value }))}
          />
          <div className="post-detail__headmain">
            <h1 className="post-detail__title">
              <CardText text={post.title} />
              {post.moderationStatus === 'PENDING' && (
                <span className="badge-pending" title={t('forums.pendingReview', 'Pending review')}>
                  ⏳ {t('forums.pending', 'Pending')}
                </span>
              )}
            </h1>
            <div className="post-detail__meta">
              {t('forums.by', 'by')} <Link to={`/users/${post.authorId}`}>{post.authorName}</Link>
              {' · '}
              <span>{new Date(post.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <p className="post-detail__body"><CardText text={post.body} /></p>

        <div className="post-detail__footer">
          <span className="post-detail__stat">
            💬 {post.commentCount} {t('forums.comments', 'comments')}
          </span>
          {forumId && <ReportButton forumId={forumId} kind="posts" id={post.id} />}
        </div>
      </article>

      {forumId && <CommentList postId={post.id} forumId={forumId} />}
    </Container>
  );
}
