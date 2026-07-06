import { useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../../store/hooks';
import { createPost } from '../../../features/forum/forumSlice';

interface Props {
  threadId: string;
  show: boolean;
  onHide: () => void;
}

/** Dialog for starting a new topic (Post) in a forum, replacing the old inline form. */
export function CreatePostModal({ threadId, show, onHide }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [heldForReview, setHeldForReview] = useState(false);

  const reset = () => {
    setTitle('');
    setBody('');
    setError(null);
    setHeldForReview(false);
  };

  const close = () => {
    reset();
    onHide();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setPending(true);
    setError(null);
    try {
      const created = await dispatch(
        createPost({ threadId, title: title.trim(), body: body.trim() }),
      ).unwrap();
      if (created.moderationStatus === 'PENDING') {
        setHeldForReview(true);
      } else {
        close();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message.includes('422')
        ? t('forums.postRejected', 'Your post was rejected by moderation.')
        : t('forums.postError', 'Could not publish. Try again.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal show={show} onHide={close} centered contentClassName="forum-modal">
      <Modal.Header closeButton>
        <Modal.Title className="h5">{t('forums.newPost', 'New post')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {heldForReview ? (
          <div className="held-notice">
            <span className="held-notice__glyph" aria-hidden="true">⏳</span>
            <h3 className="h6">{t('forums.heldTitle', 'Held for review')}</h3>
            <p className="text-muted mb-3">
              {t('forums.postHeld', 'Your post was flagged and is awaiting moderator review.')}
            </p>
            <Button size="sm" onClick={close}>{t('common.ok', 'OK')}</Button>
          </div>
        ) : (
          <Form onSubmit={submit}>
            <Form.Group className="mb-2">
              <Form.Label>{t('forums.postTitle', 'Title')}</Form.Label>
              <Form.Control value={title} maxLength={200} required autoFocus
                placeholder={t('forums.postTitle', 'Title')}
                onChange={(e) => setTitle(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('forums.postBody', 'Share your thoughts…')}</Form.Label>
              <Form.Control as="textarea" rows={5} value={body} maxLength={10000} required
                placeholder={t('forums.postBody', 'Share your thoughts…')}
                onChange={(e) => setBody(e.target.value)} />
            </Form.Group>
            {error && <p className="text-danger small mb-2">{error}</p>}
            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" size="sm" onClick={close} type="button">
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={!title.trim() || !body.trim() || pending}>
                {pending ? t('common.saving', 'Saving…') : t('forums.publish', 'Publish')}
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
}
