import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createPost, fetchPosts } from '../../features/forum/forumSlice';
import { CommentList } from './CommentList';

/** A forum thread: its posts (newest first), a new-post form, and per-post comment threads. */
export function ForumThread() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const posts = useAppSelector((s) => (id ? s.forum.posts[id] ?? [] : []));
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (id) dispatch(fetchPosts(id));
  }, [dispatch, id]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !title.trim() || !body.trim()) return;
    dispatch(createPost({ threadId: id, title: title.trim(), body: body.trim() }));
    setTitle('');
    setBody('');
  };

  return (
    <div className="container py-4">
      <Link to="/forums" className="text-decoration-none">← Back to forums</Link>

      {isAuthenticated && (
        <form onSubmit={submit} className="card card-body my-3">
          <h6>New post</h6>
          <input
            className="form-control mb-2"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="form-control mb-2"
            placeholder="Share your thoughts…"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div>
            <button type="submit" className="btn btn-primary btn-sm"
                    disabled={!title.trim() || !body.trim()}>
              Publish
            </button>
          </div>
        </form>
      )}

      {posts.length === 0 && <p className="text-muted">No posts yet. Be the first!</p>}

      {posts.map((p) => (
        <article key={p.id} className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <h5 className="card-title mb-1">{p.title}</h5>
              <small className="text-muted">{new Date(p.createdAt).toLocaleString()}</small>
            </div>
            <h6 className="card-subtitle mb-2 text-muted">
              by <Link to={`/users/${p.authorId}`}>{p.authorName}</Link>
            </h6>
            <p className="card-text" style={{ whiteSpace: 'pre-wrap' }}>{p.body}</p>
            <button
              type="button"
              className="btn btn-link btn-sm px-0"
              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            >
              {expanded === p.id ? 'Hide' : 'Show'} comments ({p.commentCount})
            </button>
            {expanded === p.id && <CommentList postId={p.id} />}
          </div>
        </article>
      ))}
    </div>
  );
}
