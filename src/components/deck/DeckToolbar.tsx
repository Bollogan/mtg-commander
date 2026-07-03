import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { FormatRules } from '../../data/formats';
import type { GroupBy, ImageSize, SortBy, ViewMode } from './deckView';

interface DeckToolbarProps {
  view: ViewMode;
  onView: (v: ViewMode) => void;
  groupBy: GroupBy;
  onGroupBy: (g: GroupBy) => void;
  sortBy: SortBy;
  onSortBy: (s: SortBy) => void;
  imageSize: ImageSize;
  onImageSize: (s: ImageSize) => void;
  format: string;
  onFormat: (f: string) => void;
  formats: FormatRules[];
  readOnly?: boolean;
}

const VIEWS: { id: ViewMode; icon: string }[] = [
  { id: 'stacks', icon: '▤' },
  { id: 'grid', icon: '▦' },
  { id: 'text', icon: '☰' },
  { id: 'table', icon: '▥' },
];

const GROUPS: GroupBy[] = ['category', 'type', 'cmc', 'color', 'rarity'];
const SORTS: SortBy[] = ['name', 'cmc', 'rarity', 'qty'];
const SIZES: ImageSize[] = ['sm', 'md', 'lg'];

export const DeckToolbar = ({
  view, onView, groupBy, onGroupBy, sortBy, onSortBy, imageSize, onImageSize, format, onFormat, formats, readOnly,
}: DeckToolbarProps) => {
  const { t } = useTranslation();
  const showImageSize = view === 'stacks' || view === 'grid';

  return (
    <div className="deck-toolbar">
      <div className="deck-toolbar__group" role="group" aria-label={t('builder.view')}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`seg-btn${view === v.id ? ' is-active' : ''}`}
            onClick={() => onView(v.id)}
            title={t(`builder.view_${v.id}`)}
          >
            <span aria-hidden="true">{v.icon}</span>
            <span className="seg-btn__label">{t(`builder.view_${v.id}`)}</span>
          </button>
        ))}
      </div>

      <label className="deck-toolbar__field">
        <span>{t('builder.format')}</span>
        <Form.Select size="sm" value={format} onChange={(e) => onFormat(e.target.value)} disabled={readOnly}>
          {formats.map((f) => (
            <option key={f.format} value={f.format}>{f.label}</option>
          ))}
        </Form.Select>
      </label>

      <label className="deck-toolbar__field">
        <span>{t('builder.group')}</span>
        <Form.Select size="sm" value={groupBy} onChange={(e) => onGroupBy(e.target.value as GroupBy)}>
          {GROUPS.map((g) => <option key={g} value={g}>{t(`builder.group_${g}`)}</option>)}
        </Form.Select>
      </label>

      <label className="deck-toolbar__field">
        <span>{t('builder.sort')}</span>
        <Form.Select size="sm" value={sortBy} onChange={(e) => onSortBy(e.target.value as SortBy)}>
          {SORTS.map((s) => <option key={s} value={s}>{t(`builder.sort_${s}`)}</option>)}
        </Form.Select>
      </label>

      {showImageSize && (
        <label className="deck-toolbar__field">
          <span>{t('builder.size')}</span>
          <Form.Select size="sm" value={imageSize} onChange={(e) => onImageSize(e.target.value as ImageSize)}>
            {SIZES.map((s) => <option key={s} value={s}>{t(`builder.size_${s}`)}</option>)}
          </Form.Select>
        </label>
      )}
    </div>
  );
};
