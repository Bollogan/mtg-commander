import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { searchForums, clearSearch, type ForumSearchParams } from '../../../features/forum/forumSlice';
import { ForumCard } from './ForumCard';

const CATEGORIES = ['', 'GENERAL', 'DECK_DISCUSSION', 'RULES', 'TRADE', 'LORE', 'CUSTOM'];
const SORTS = ['relevance', 'activity', 'members', 'newest', 'name'];
const ACTIVITY = ['', 'high', 'medium', 'low'];

/** Advanced forum search: text query across selectable fields plus category/activity/sort filters. */
export function ForumSearchPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const result = useAppSelector((s) => s.forum.search);
  const status = useAppSelector((s) => s.forum.searchStatus);

  const [q, setQ] = useState('');
  const [fields, setFields] = useState<string[]>(['name', 'description']);
  const [category, setCategory] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [advanced, setAdvanced] = useState(false);

  const toggleField = (f: string) =>
    setFields((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const run = (page = 0) => {
    const params: ForumSearchParams = {
      q, searchIn: fields, category, activityLevel, sortBy, page, size: 12,
    };
    dispatch(searchForums(params));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(0);
  };

  const reset = () => {
    setQ('');
    setCategory('');
    setActivityLevel('');
    setSortBy('relevance');
    setFields(['name', 'description']);
    dispatch(clearSearch());
  };

  return (
    <div className="forum-search">
      <form onSubmit={onSubmit} className="forum-search__bar">
        <input
          className="form-control forum-search__input"
          placeholder={t('forums.searchPlaceholder', 'Search forums, topics, tags…')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" disabled={status === 'loading'}>
          {t('forums.searchBtn', 'Search')}
        </Button>
        <Button type="button" variant="outline-secondary" onClick={() => setAdvanced((a) => !a)}>
          {t('forums.advanced', 'Advanced')} {advanced ? '▲' : '▼'}
        </Button>
      </form>

      {advanced && (
        <div className="forum-search__filters">
          <div className="filter-group">
            <span className="filter-label">{t('forums.searchIn', 'Search in')}</span>
            {['name', 'description', 'tags'].map((f) => (
              <label key={f} className={`chip-toggle${fields.includes(f) ? ' is-on' : ''}`}>
                <input type="checkbox" checked={fields.includes(f)} onChange={() => toggleField(f)} />
                {t(`forums.field.${f}`, f)}
              </label>
            ))}
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="fcat">{t('forums.field.category', 'Category')}</label>
            <select id="fcat" className="form-select form-select-sm" value={category}
                    onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c ? t(`forums.category.${c}`, c) : t('forums.all', 'All')}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="fact">{t('forums.activity', 'Activity')}</label>
            <select id="fact" className="form-select form-select-sm" value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value)}>
              {ACTIVITY.map((a) => (
                <option key={a} value={a}>{a ? t(`forums.activityLevel.${a}`, a) : t('forums.all', 'All')}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="fsort">{t('forums.sortBy', 'Sort by')}</label>
            <select id="fsort" className="form-select form-select-sm" value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}>
              {SORTS.map((s) => <option key={s} value={s}>{t(`forums.sort.${s}`, s)}</option>)}
            </select>
          </div>
          <Button size="sm" variant="link" onClick={reset}>{t('forums.clear', 'Clear')}</Button>
        </div>
      )}

      {result && (
        <div className="forum-search__results">
          <div className="section-head">
            <span className="section-count">
              {t('forums.resultsCount', '{{count}} forums', { count: result.total })}
            </span>
          </div>
          {result.items.length === 0 ? (
            <div className="grid-empty">
              <span className="grid-empty__glyph" aria-hidden="true">✦</span>
              <p className="mb-0">{t('forums.noResults', 'No forums match your search.')}</p>
            </div>
          ) : (
            <div className="forum-grid">
              {result.items.map((f) => <ForumCard key={f.id} forum={f} />)}
            </div>
          )}
          {(result.hasMore || result.page > 0) && (
            <div className="d-flex justify-content-between mt-3">
              <Button size="sm" variant="outline-secondary" disabled={result.page === 0}
                      onClick={() => run(result.page - 1)}>
                ← {t('common.prev', 'Prev')}
              </Button>
              <Button size="sm" variant="outline-secondary" disabled={!result.hasMore}
                      onClick={() => run(result.page + 1)}>
                {t('common.next', 'Next')} →
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
