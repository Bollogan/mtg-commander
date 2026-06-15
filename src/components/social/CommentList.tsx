import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createComment, fetchComments } from '../../features/forum/forumSlice';

interface Props {
  postId: string;
}

/** Renders comments for a post (oldest first) with an inline add-comment form. */
export function CommentList({ postId }: Props) {
  const dispatch = useAppDispatch();
  const comments = useAppSelector((s) => s.forum.comments[postId] ?? []);
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));
  const [body, setBody] = useState('');

  useEffect(() => {
    dispatch(fetchComments(postId));
  }, [dispatch, postId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    dispatch(createComment({ postId, body: trimmed }));
    setBody('');
  };

  return (
    <div className="mt-3">
      <h6 className="text-muted">Comments ({comments.length})</h6>
      <ul className="list-unstyled">
        {comments.map((c) => (
          <li key={c.id} className="border-bottom py-2">
            <strong>{c.authorName}</strong>{' '}
            <small className="text-muted">{new Date(c.createdAt).toLocaleString()}</small>
            <div>{c.body}</div>
          </li>
        ))}
        {comments.length === 0 && <li className="text-muted">No comments yet.</li>}
      </ul>

      {isAuthenticated && (
        <form onSubmit={submit} className="d-flex gap-2 mt-2">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Write a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button type="submit" className="btn btn-sm btn-primary" disabled={!body.trim()}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}
