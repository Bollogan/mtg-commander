import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="container py-4">
      <h2>Forums</h2>

      {isAuthenticated && (
        <form onSubmit={submit} className="card card-body my-3">
          <h6>Start a new forum</h6>
          <input className="form-control mb-2" placeholder="Title" value={title}
                 onChange={(e) => setTitle(e.target.value)} />
          <input className="form-control mb-2" placeholder="Description (optional)" value={description}
                 onChange={(e) => setDescription(e.target.value)} />
          <div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!title.trim()}>
              Create
            </button>
          </div>
        </form>
      )}

      <ul className="list-group">
        {threads.map((t) => (
          <li key={t.id} className="list-group-item d-flex justify-content-between align-items-start">
            <div>
              <Link to={`/forums/${t.id}`} className="fw-bold text-decoration-none">{t.title}</Link>
              {t.description && <div className="text-muted small">{t.description}</div>}
              <small className="text-muted">by {t.authorName}</small>
            </div>
            <span className="badge bg-secondary rounded-pill">{t.postCount} posts</span>
          </li>
        ))}
        {threads.length === 0 && <li className="list-group-item text-muted">No forums yet.</li>}
      </ul>

      {cursor && (
        <button className="btn btn-outline-secondary btn-sm mt-3"
                onClick={() => dispatch(fetchThreads(cursor))}>
          Load more
        </button>
      )}
    </div>
  );
}
