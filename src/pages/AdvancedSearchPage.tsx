import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Col, Container, Form, Row } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { CardGrid } from '../components/CardGrid';
import { searchCards, type SearchResponse } from '../services/scryfallApi';

// ─── Scryfall query builder ───────────────────────────────────────────────────
// Maps the form into Scryfall's search syntax (https://scryfall.com/docs/syntax).

type ColorMode = 'including' | 'exact' | 'atmost';
type CmcOp = '=' | '<=' | '>=';

interface Filters {
  text: string;
  colors: string; // subset of WUBRGC
  colorMode: ColorMode;
  type: string;
  rarity: string;
  cmc: string;
  cmcOp: CmcOp;
  set: string;
  oracle: string;
  format: string;
  raw: string;
}

const EMPTY: Filters = {
  text: '', colors: '', colorMode: 'including', type: '', rarity: '',
  cmc: '', cmcOp: '>=', set: '', oracle: '', format: '', raw: '',
};

const COLOR_MAP: Record<string, string> = { W: '⚪', U: '🔵', B: '⚫', R: '🔴', G: '🟢', C: '◇' };

const buildQuery = (f: Filters): string => {
  const parts: string[] = [];
  if (f.text.trim()) parts.push(f.text.trim());
  if (f.colors) {
    const op = f.colorMode === 'exact' ? '=' : f.colorMode === 'atmost' ? '<=' : '>=';
    parts.push(`c${op}${f.colors.toLowerCase()}`);
  }
  if (f.type.trim()) parts.push(`t:${f.type.trim()}`);
  if (f.rarity) parts.push(`r:${f.rarity}`);
  if (f.cmc.trim() !== '') parts.push(`cmc${f.cmcOp}${f.cmc.trim()}`);
  if (f.set.trim()) parts.push(`set:${f.set.trim()}`);
  if (f.oracle.trim()) parts.push(`o:"${f.oracle.trim()}"`);
  if (f.format) parts.push(`legal:${f.format}`);
  if (f.raw.trim()) parts.push(f.raw.trim());
  return parts.join(' ').trim();
};

export const AdvancedSearchPage = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const toggleColor = (c: string) =>
    setFilters((prev) => ({
      ...prev,
      colors: prev.colors.includes(c) ? prev.colors.replace(c, '') : prev.colors + c,
    }));

  const preview = useMemo(() => buildQuery(filters), [filters]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(preview);
  };

  const onReset = () => {
    setFilters(EMPTY);
    setQuery('');
  };

  const { data, isFetching } = useQuery<SearchResponse>({
    queryKey: ['advancedSearch', query, page],
    queryFn: () => searchCards(query, page),
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
  });

  const totalCards = data?.totalCards ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = totalCards > 0 ? Math.ceil(totalCards / pageSize) : 0;

  return (
    <Container className="page-container">
      <motion.div
        className="app-hero"
        initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <span className="eyebrow">✦ {t('nav.search')}</span>
        <h1>{t('advSearch.title')}</h1>
        <p>{t('advSearch.subtitle')}</p>
      </motion.div>

      <Form className="filter-panel" onSubmit={onSubmit}>
        <Row className="g-3">
          <Col xs={12} md={6}>
            <Form.Label className="filter-label">{t('advSearch.name')}</Form.Label>
            <Form.Control
              value={filters.text}
              onChange={(e) => set('text', e.target.value)}
              placeholder={t('advSearch.namePlaceholder')}
            />
          </Col>
          <Col xs={12} md={6}>
            <Form.Label className="filter-label">{t('advSearch.colors')}</Form.Label>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <div className="color-toggle-group" role="group" aria-label={t('advSearch.colors')}>
                {Object.keys(COLOR_MAP).map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`color-toggle${filters.colors.includes(c) ? ' is-on' : ''}`}
                    aria-pressed={filters.colors.includes(c)}
                    onClick={() => toggleColor(c)}
                    title={c}
                  >
                    {COLOR_MAP[c]}
                  </button>
                ))}
              </div>
              <Form.Select
                className="w-auto"
                value={filters.colorMode}
                onChange={(e) => set('colorMode', e.target.value as ColorMode)}
                aria-label={t('advSearch.colorMode')}
              >
                <option value="including">{t('advSearch.colorIncluding')}</option>
                <option value="exact">{t('advSearch.colorExact')}</option>
                <option value="atmost">{t('advSearch.colorAtMost')}</option>
              </Form.Select>
            </div>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Form.Label className="filter-label">{t('advSearch.type')}</Form.Label>
            <Form.Control
              value={filters.type}
              onChange={(e) => set('type', e.target.value)}
              placeholder="creature, instant…"
            />
          </Col>
          <Col xs={6} sm={3} md={2}>
            <Form.Label className="filter-label">{t('card.rarity')}</Form.Label>
            <Form.Select value={filters.rarity} onChange={(e) => set('rarity', e.target.value)}>
              <option value="">—</option>
              <option value="common">{t('advSearch.rarityCommon')}</option>
              <option value="uncommon">{t('advSearch.rarityUncommon')}</option>
              <option value="rare">{t('advSearch.rarityRare')}</option>
              <option value="mythic">{t('advSearch.rarityMythic')}</option>
            </Form.Select>
          </Col>
          <Col xs={6} sm={3} md={3}>
            <Form.Label className="filter-label">{t('card.cmc')}</Form.Label>
            <div className="d-flex gap-2">
              <Form.Select
                className="w-auto"
                value={filters.cmcOp}
                onChange={(e) => set('cmcOp', e.target.value as CmcOp)}
                aria-label={t('card.cmc')}
              >
                <option value=">=">≥</option>
                <option value="=">=</option>
                <option value="<=">≤</option>
              </Form.Select>
              <Form.Control
                type="number"
                min={0}
                value={filters.cmc}
                onChange={(e) => set('cmc', e.target.value)}
                placeholder="3"
              />
            </div>
          </Col>
          <Col xs={6} sm={3} md={2}>
            <Form.Label className="filter-label">{t('card.set')}</Form.Label>
            <Form.Control
              value={filters.set}
              onChange={(e) => set('set', e.target.value)}
              placeholder="mh3"
            />
          </Col>

          <Col xs={12} md={6}>
            <Form.Label className="filter-label">{t('advSearch.oracle')}</Form.Label>
            <Form.Control
              value={filters.oracle}
              onChange={(e) => set('oracle', e.target.value)}
              placeholder={t('advSearch.oraclePlaceholder')}
            />
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Form.Label className="filter-label">{t('advSearch.format')}</Form.Label>
            <Form.Select value={filters.format} onChange={(e) => set('format', e.target.value)}>
              <option value="">—</option>
              <option value="commander">Commander</option>
              <option value="standard">Standard</option>
              <option value="pioneer">Pioneer</option>
              <option value="modern">Modern</option>
              <option value="legacy">Legacy</option>
              <option value="pauper">Pauper</option>
            </Form.Select>
          </Col>
          <Col xs={12} md={3}>
            <Form.Label className="filter-label">{t('advSearch.raw')}</Form.Label>
            <Form.Control
              value={filters.raw}
              onChange={(e) => set('raw', e.target.value)}
              placeholder="pow>=4 -is:reprint"
            />
          </Col>
        </Row>

        <div className="filter-actions">
          <code className="filter-preview" aria-live="polite">
            {preview || t('advSearch.previewEmpty')}
          </code>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onReset}>
              {t('advSearch.reset')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!preview}>
              {t('advSearch.search')}
            </button>
          </div>
        </div>
      </Form>

      {query && (
        <>
          <div className="section-head">
            <h2 className="section-title mb-0">{t('search.resultsTitle')}</h2>
            {totalCards > 0 && (
              <span className="section-count tabular-nums">{totalCards.toLocaleString()}</span>
            )}
          </div>
          <CardGrid cards={data?.cards ?? []} loading={isFetching} />

          {totalPages > 1 && (
            <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹ {t('advSearch.prev')}
              </button>
              <span className="text-muted small tabular-nums">{page} / {totalPages}</span>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t('advSearch.next')} ›
              </button>
            </div>
          )}
        </>
      )}
    </Container>
  );
};
