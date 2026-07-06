import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createComment, fetchComments, voteComment, type Comment,
} from '../../features/forum/forumSlice';
import { ReportButton } from './forum/ReportButton';
import { CardText } from './forum/CardText';
import { VoteWidget } from './forum/VoteWidget';

interface Props {
  postId: string;
  forumId: string;
}

/** Loads a post's replies and renders them as an unbounded nested tree with per-node reply forms. */
export function CommentList({ postId, forumId }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const comments = useAppSelector((s) => s.forum.comments[postId] ?? []);
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));

  useEffect(() => {
    dispatch(fetchComments(postId));
  }, [dispatch, postId]);

  // Group replies by parent so we can render the tree; roots have no parentCommentId.
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Comment[]>();
    for (const c of comments) {
      const key = c.parentCommentId ?? null;
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return map;
  }, [comments]);

  const roots = childrenByParent.get(null) ?? [];

  return (
    <section className="comment-tree">
      <h3 className="comment-tree__heading">
        {t('forums.comments', 'comments')} ({comments.length})
      </h3>

      {isAuthenticated && (
        <CommentForm postId={postId} parentCommentId={null} placeholderKey="writeComment" />
      )}

      {roots.length === 0 ? (
        <p className="text-muted mt-3">{t('forums.noComments', 'No comments yet.')}</p>
      ) : (
        <ul className="comment-list">
          {roots.map((c) => (
            <CommentNode key={c.id} comment={c} childrenByParent={childrenByParent}
              postId={postId} forumId={forumId} depth={0} />
          ))}
        </ul>
      )}
    </section>
  );
}

interface NodeProps {
  comment: Comment;
  childrenByParent: Map<string | null, Comment[]>;
  postId: string;
  forumId: string;
  depth: number;
}

/** A single comment plus its nested replies (rendered recursively, indentation clamped in CSS). */
function CommentNode({ comment, childrenByParent, postId, forumId, depth }: NodeProps) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));
  const [replying, setReplying] = useState(false);
  const children = childrenByParent.get(comment.id) ?? [];

  return (
    <li className="comment-node">
      <div className="comment-node__body">
        <VoteWidget
          score={comment.score}
          myVote={comment.myVote}
          disabled={!isAuthenticated}
          size="sm"
          onVote={(value) => dispatch(voteComment({ commentId: comment.id, postId, value }))}
        />
        <div className="comment-node__main">
          <div className="comment-node__meta">
            <strong>{comment.authorName}</strong>{' '}
            <small className="text-muted">{new Date(comment.createdAt).toLocaleString()}</small>
            {comment.moderationStatus === 'PENDING' && (
              <span className="badge-pending" title={t('forums.pendingReview', 'Pending review')}>⏳</span>
            )}
          </div>
          <p className="comment-node__text"><CardText text={comment.body} /></p>
          <div className="comment-node__actions">
            {isAuthenticated && (
              <button type="button" className="comment-action" onClick={() => setReplying((v) => !v)}>
                {replying ? t('common.cancel', 'Cancel') : t('forums.reply', 'Reply')}
              </button>
            )}
            <ReportButton forumId={forumId} kind="comments" id={comment.id} />
          </div>
          {replying && (
            <CommentForm postId={postId} parentCommentId={comment.id}
              placeholderKey="writeReply" onDone={() => setReplying(false)} />
          )}
        </div>
      </div>

      {children.length > 0 && (
        <ul className="comment-list">
          {children.map((child) => (
            <CommentNode key={child.id} comment={child} childrenByParent={childrenByParent}
              postId={postId} forumId={forumId} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

interface FormProps {
  postId: string;
  parentCommentId: string | null;
  placeholderKey: 'writeComment' | 'writeReply';
  onDone?: () => void;
}

/** Inline composer for a top-level comment or a nested reply. */
function CommentForm({ postId, parentCommentId, placeholderKey, onDone }: FormProps) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const placeholder = placeholderKey === 'writeReply'
    ? t('forums.writeReply', 'Write a reply…')
    : t('forums.writeComment', 'Write a comment…');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setNotice(null);
    setPending(true);
    try {
      const created = await dispatch(createComment({ postId, body: trimmed, parentCommentId })).unwrap();
      setBody('');
      if (created.moderationStatus === 'PENDING') {
        setNotice(t('forums.commentHeld', 'Your comment is awaiting review.'));
      } else {
        onDone?.();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setNotice(message.includes('422')
        ? t('forums.commentRejected', 'Your comment was rejected by moderation.')
        : t('forums.postError', 'Could not publish. Try again.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className={`comment-form${parentCommentId ? ' comment-form--reply' : ''}`}>
      <input
        type="text"
        className="form-control form-control-sm"
        placeholder={placeholder}
        value={body}
        autoFocus={Boolean(parentCommentId)}
        onChange={(e) => setBody(e.target.value)}
      />
      <button type="submit" className="btn btn-sm btn-primary" disabled={!body.trim() || pending}>
        {t('forums.send', 'Send')}
      </button>
      {notice && <p className="held-inline w-100 mt-1 mb-0">{notice}</p>}
    </form>
  );
}
