import { useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../../store/hooks';
import { createThread, type CreateForumInput } from '../../../features/forum/forumSlice';

const CATEGORIES = ['GENERAL', 'DECK_DISCUSSION', 'RULES', 'TRADE', 'LORE', 'CUSTOM'];
const LANGUAGES = ['es', 'en', 'pt', 'fr', 'de', 'it'];

interface Props {
  show: boolean;
  onHide: () => void;
}

/** Rich forum-creation dialog: name, description, category, tags, images, language and flags. */
export function CreateForumModal({ show, onHide }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateForumInput>({ title: '', category: 'GENERAL', language: 'es' });
  const [tagsRaw, setTagsRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [heldForReview, setHeldForReview] = useState(false);

  const set = <K extends keyof CreateForumInput>(k: K, v: CreateForumInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setPending(true);
    setError(null);
    const tags = tagsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      const created = await dispatch(createThread({ ...form, title: form.title.trim(), tags })).unwrap();
      if (created.moderationStatus === 'PENDING') {
        setHeldForReview(true);
      } else {
        reset();
        onHide();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Moderation rejections surface as a 422 from the backend.
      setError(message.includes('422')
        ? t('forums.moderationRejected', 'Your forum was rejected by moderation. Please revise the name/description.')
        : t('forums.createError', 'Could not create the forum. Try again.'));
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setForm({ title: '', category: 'GENERAL', language: 'es' });
    setTagsRaw('');
    setError(null);
    setHeldForReview(false);
  };

  return (
    <Modal show={show} onHide={onHide} centered contentClassName="forum-modal">
      <Modal.Header closeButton>
        <Modal.Title className="h5">{t('forums.create', 'Create a forum')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {heldForReview ? (
          <div className="held-notice">
            <span className="held-notice__glyph" aria-hidden="true">⏳</span>
            <h3 className="h6">{t('forums.heldTitle', 'Held for review')}</h3>
            <p className="text-muted mb-3">
              {t('forums.heldBody', 'Our moderation flagged this for a human check. It will appear once approved.')}
            </p>
            <Button size="sm" onClick={() => { reset(); onHide(); }}>{t('common.ok', 'OK')}</Button>
          </div>
        ) : (
          <Form onSubmit={submit}>
            <Form.Group className="mb-2">
              <Form.Label>{t('forums.field.name', 'Name')}</Form.Label>
              <Form.Control value={form.title} maxLength={120} required
                onChange={(e) => set('title', e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>{t('forums.field.description', 'Description')}</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value)} />
            </Form.Group>
            <div className="row g-2">
              <div className="col-6">
                <Form.Group className="mb-2">
                  <Form.Label>{t('forums.field.category', 'Category')}</Form.Label>
                  <Form.Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{t(`forums.category.${c}`, c)}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-6">
                <Form.Group className="mb-2">
                  <Form.Label>{t('forums.field.language', 'Language')}</Form.Label>
                  <Form.Select value={form.language} onChange={(e) => set('language', e.target.value)}>
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
            <Form.Group className="mb-2">
              <Form.Label>{t('forums.field.tags', 'Tags (comma separated)')}</Form.Label>
              <Form.Control value={tagsRaw} placeholder="commander, budget, combo"
                onChange={(e) => setTagsRaw(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>{t('forums.field.coverImage', 'Cover image URL')}</Form.Label>
              <Form.Control value={form.coverImage ?? ''} placeholder="https://…"
                onChange={(e) => set('coverImage', e.target.value)} />
            </Form.Group>
            <div className="d-flex gap-3 mb-3">
              <Form.Check type="switch" id="nsfw" label={t('forums.field.nsfw', 'NSFW')}
                checked={Boolean(form.nsfw)} onChange={(e) => set('nsfw', e.target.checked)} />
              <Form.Check type="switch" id="private" label={t('forums.field.private', 'Private')}
                checked={Boolean(form.isPrivate)} onChange={(e) => set('isPrivate', e.target.checked)} />
            </div>
            {error && <p className="text-danger small mb-2">{error}</p>}
            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" size="sm" onClick={onHide} type="button">
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={!form.title.trim() || pending}>
                {pending ? t('common.saving', 'Saving…') : t('forums.create', 'Create forum')}
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
}
