import { useEffect, useState } from 'react';
import { Button, Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { fetchRails, fetchThreads } from '../../features/forum/forumSlice';
import { useForumDiscoveryStream } from '../../features/forum/useForumDiscoveryStream';
import { ForumRail } from './forum/ForumRail';
import { ForumCard } from './forum/ForumCard';
import { ConstellationView } from './forum/ConstellationView';
import { CreateForumModal } from './forum/CreateForumModal';
import { ForumSearchPanel } from './forum/ForumSearchPanel';

type ViewMode = 'mosaic' | 'constellation' | 'list';

/**
 * The forum discovery hub (spec §2.1): a hybrid surface with three views — a premium card Mosaic of
 * Trending/Rising/New rails (default), a Constellation star-map, and a dense List — plus advanced
 * search and forum creation.
 */
export function ForumsPage() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const rails = useAppSelector((s) => s.forum.rails);
  const railsStatus = useAppSelector((s) => s.forum.railsStatus);
  const threads = useAppSelector((s) => s.forum.threads);
  const cursor = useAppSelector((s) => s.forum.threadsCursor);
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));

  const [view, setView] = useState<ViewMode>('mosaic');
  const [showCreate, setShowCreate] = useState(false);

  // Live vote tallies for every card across all rails/list, over the shared discovery SSE stream.
  useForumDiscoveryStream();

  useDocumentTitle(
    t('forums.title', 'The Forums'),
    t('forums.subtitle', 'Discover the most active corners of the Multiverse.'),
  );

  useEffect(() => {
    dispatch(fetchRails(12));
    dispatch(fetchThreads(undefined));
  }, [dispatch]);

  // Union of all rail forums powers the constellation map.
  const allForums = rails
    ? Array.from(new Map([...rails.trending, ...rails.rising, ...rails.newest].map((f) => [f.id, f])).values())
    : threads;

  const views: Array<{ id: ViewMode; label: string; glyph: string }> = [
    { id: 'mosaic', label: t('forums.view.mosaic', 'Mosaic'), glyph: '▦' },
    { id: 'constellation', label: t('forums.view.constellation', 'Constellation'), glyph: '✦' },
    { id: 'list', label: t('forums.view.list', 'List'), glyph: '☰' },
  ];

  return (
    <Container className="page-container">
      <div className="forum-hero">
        <div>
          <h1 className="forum-hero__title">{t('forums.title', 'The Forums')}</h1>
          <p className="forum-hero__subtitle">
            {t('forums.subtitle', 'Discover the most active corners of the Multiverse.')}
          </p>
        </div>
        {isAuthenticated && (
          <Button className="forum-hero__cta" onClick={() => setShowCreate(true)}>
            + {t('forums.create', 'Create a forum')}
          </Button>
        )}
      </div>

      <ForumSearchPanel />

      <div className="forum-viewbar">
        <div className="seg" role="tablist" aria-label={t('forums.views', 'Views')}>
          {views.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              className={`seg-btn${view === v.id ? ' is-active' : ''}`}
              onClick={() => setView(v.id)}
            >
              <span aria-hidden="true">{v.glyph}</span> {v.label}
            </button>
          ))}
        </div>
      </div>

      {railsStatus === 'loading' && !rails && (
        <div className="forum-rail__track">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="forum-card forum-card--skeleton" />)}
        </div>
      )}

      {view === 'mosaic' && rails && (
        <>
          <ForumRail title={t('forums.trending', 'Trending')} glyph="🔥"
            subtitle={t('forums.trendingSub', 'Highest activity this week')} forums={rails.trending} />
          <ForumRail title={t('forums.rising', 'Rising')} glyph="📈"
            subtitle={t('forums.risingSub', 'Young forums gaining momentum')} forums={rails.rising} />
          <ForumRail title={t('forums.newest', 'New')} glyph="✨"
            subtitle={t('forums.newestSub', 'Freshly created')} forums={rails.newest} />
          {rails.trending.length === 0 && rails.rising.length === 0 && rails.newest.length === 0 && (
            <div className="grid-empty">
              <span className="grid-empty__glyph" aria-hidden="true">✦</span>
              <p className="mb-0">{t('forums.empty', 'No forums yet. Start the first conversation.')}</p>
            </div>
          )}
        </>
      )}

      {view === 'constellation' && <ConstellationView forums={allForums} />}

      {view === 'list' && (
        <>
          {threads.length === 0 ? (
            <div className="grid-empty">
              <span className="grid-empty__glyph" aria-hidden="true">✦</span>
              <p className="mb-0">{t('forums.empty', 'No forums yet. Start the first conversation.')}</p>
            </div>
          ) : (
            <div className="forum-grid">
              {threads.map((f) => <ForumCard key={f.id} forum={f} />)}
            </div>
          )}
          {cursor && (
            <Button variant="outline-secondary" size="sm" className="mt-3"
                    onClick={() => dispatch(fetchThreads(cursor))}>
              {t('forums.loadMore', 'Load more')}
            </Button>
          )}
        </>
      )}

      <CreateForumModal show={showCreate} onHide={() => setShowCreate(false)} />
    </Container>
  );
}
