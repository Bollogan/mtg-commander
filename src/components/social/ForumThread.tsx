import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Container } from 'react-bootstrap';
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
    <Container className="page-container content-narrow">
      <Link to="/forums" className="back-link">← Back to forums</Link>

      {isAuthenticated && (
        <form onSubmit={submit} className="deck-card p-3 my-3">
          <h2 className="h6 mb-2">New post</h2>
          <input
            className="form-control mb-2"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="form-control mb-3"
            placeholder="Share your thoughts…"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={!title.trim() || !body.trim()}>
            Publish
          </Button>
        </form>
      )}

      {posts.length === 0 && (
        <div className="grid-empty">
          <span className="grid-empty__glyph" aria-hidden="true">✦</span>
          <p className="mb-0">No posts yet. Be the first to write one.</p>
        </div>
      )}

      {posts.map((p) => (
        <article key={p.id} className="deck-card post-card">
          <div className="post-head">
            <h3 className="post-title">{p.title}</h3>
            <span className="post-time">{new Date(p.createdAt).toLocaleString()}</span>
          </div>
          <div className="post-author">
            by <Link to={`/users/${p.authorId}`}>{p.authorName}</Link>
          </div>
          <p className="post-body">{p.body}</p>
          <button
            type="button"
            className="btn btn-link btn-sm px-0 mt-2"
            onClick={() => setExpanded(expanded === p.id ? null : p.id)}
          >
            {expanded === p.id ? 'Hide' : 'Show'} comments ({p.commentCount})
          </button>
          {expanded === p.id && <CommentList postId={p.id} />}
        </article>
      ))}
    </Container>
  );
}
