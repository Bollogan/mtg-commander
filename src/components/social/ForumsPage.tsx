import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Container } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createThread, fetchThreads } from '../../features/forum/forumSlice';

/** Lists forum threads (most recent activity first) with cursor "load more" and a create form. */
export function ForumsPage() {
  const dispatch = useAppDispatch();
  const threads = useAppSelector((s) => s.forum.threads);
  const cursor = useAppSelector((s) => s.forum.threadsCursor);
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    dispatch(fetchThreads(undefined));
  }, [dispatch]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    dispatch(createThread({ title: title.trim(), description: description.trim() || undefined }));
    setTitle('');
    setDescription('');
  };

  return (
    <Container className="page-container content-narrow">
      <div className="page-header" style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
        <h1>Forums</h1>
        <p className="text-muted mb-0">Discuss decks, rulings and the metagame with the community.</p>
      </div>

      {isAuthenticated && (
        <form onSubmit={submit} className="deck-card p-3 mb-2">
          <h2 className="h6 mb-2">Start a new forum</h2>
          <input className="form-control mb-2" placeholder="Title" value={title}
                 onChange={(e) => setTitle(e.target.value)} />
          <input className="form-control mb-3" placeholder="Description (optional)" value={description}
                 onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" size="sm" disabled={!title.trim()}>Create forum</Button>
        </form>
      )}

      {threads.length === 0 ? (
        <div className="grid-empty">
          <span className="grid-empty__glyph" aria-hidden="true">✦</span>
          <p className="mb-0">No forums yet. Start the first conversation.</p>
        </div>
      ) : (
        <div className="thread-list">
          {threads.map((t) => (
            <div key={t.id} className="thread-row">
              <div>
                <Link to={`/forums/${t.id}`} className="thread-title">{t.title}</Link>
                {t.description && <p className="thread-desc">{t.description}</p>}
                <span className="thread-author">by {t.authorName}</span>
              </div>
              <span className="meta-pill">{t.postCount} posts</span>
            </div>
          ))}
        </div>
      )}

      {cursor && (
        <Button variant="outline-secondary" size="sm" className="mt-3"
                onClick={() => dispatch(fetchThreads(cursor))}>
          Load more
        </Button>
      )}
    </Container>
  );
}
