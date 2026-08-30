import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '../../features/game/gameSlice';

const SYSTEM_AUTHOR = 'system';

const timeOf = (millis: number) =>
  new Date(millis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

interface ChatProps {
  messages: ChatMessage[];
  myId: string | null;
  onSend: (text: string) => void;
}

/** Room chat: shared by the lobby and the table, and the only place system events are narrated. */
export const GameChat = ({ messages, myId, onSend }: ChatProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  // Follow the tail, but only when the reader is already at the bottom — otherwise scrolling back
  // through the log would keep getting yanked forward by every new line.
  const lastId = messages.length ? messages[messages.length - 1].id : null;
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 120;
    if (nearBottom) log.scrollTop = log.scrollHeight;
  }, [lastId]);

  const rows = useMemo(() => messages ?? [], [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  return (
    <div className="lobby-chat">
      <div className="lobby-chat__log" ref={logRef}>
        {rows.length === 0 && <p className="text-muted small mb-0">{t('game.chatEmpty')}</p>}
        {rows.map((m) =>
          m.authorId === SYSTEM_AUTHOR ? (
            <p key={m.id} className="lobby-chat__system">{m.text}</p>
          ) : (
            <p key={m.id} className="lobby-chat__line">
              <span className={`lobby-chat__author${m.authorId === myId ? ' is-me' : ''}`}>
                {m.authorName}
              </span>
              <span className="lobby-chat__time">{timeOf(m.sentAt)}</span>
              <span className="lobby-chat__text">{m.text}</span>
            </p>
          ),
        )}
      </div>

      <Form onSubmit={submit} className="lobby-chat__form">
        <Form.Control
          size="sm"
          value={draft}
          maxLength={500}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('game.chatPlaceholder')}
          aria-label={t('game.chatPlaceholder')}
        />
        <Button size="sm" type="submit" variant="outline-secondary" disabled={!draft.trim()}>
          {t('game.chatSend')}
        </Button>
      </Form>
    </div>
  );
};
