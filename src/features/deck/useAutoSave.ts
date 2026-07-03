import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { saveDraft, type DeckDraft } from './deckSlice';

const DEBOUNCE_MS = 1500;

export const useAutoSave = () => {
  const dispatch = useAppDispatch();
  const { draft, saveStatus, current } = useAppSelector((s) => s.deck);
  const currentUserId = useAppSelector((s) => s.auth.userId);
  const lastSavedRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOwner = !draft.id || (currentUserId !== null && current?.ownerId === currentUserId);

  const draftSnapshot = (d: DeckDraft) => JSON.stringify({
    id: d.id,
    name: d.name,
    format: d.format,
    visibility: d.visibility,
    description: d.description,
    commanderName: d.commanderName,
    cards: d.cards.map((c) => ({
      scryfallId: c.scryfallId,
      qty: c.qty,
      category: c.category,
    })),
  });

  useEffect(() => {
    if (!draft.id || !isOwner) return;
    const snapshot = draftSnapshot(draft);
    if (snapshot === lastSavedRef.current) return;
    if (saveStatus === 'saving') return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch(saveDraft(draft))
        .unwrap()
        .then(() => {
          lastSavedRef.current = snapshot;
        })
        .catch(() => {
          // Error is already tracked in saveStatus.
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dispatch, draft, saveStatus]);
};
