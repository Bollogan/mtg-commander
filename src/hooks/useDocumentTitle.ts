import { useEffect } from 'react';

const BASE_TITLE = 'Planeswalkers Tower';

/**
 * Sets the document title (and optionally the meta description) for the current view, restoring the
 * previous values on unmount. A lightweight SEO/UX helper for an SPA without a full SSR/head manager
 * — improves shareable-link previews and browser-history/tab labels (Phase 7).
 */
export function useDocumentTitle(title?: string | null, description?: string | null) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) {
      document.title = `${title} · ${BASE_TITLE}`;
    }

    let metaEl: HTMLMetaElement | null = null;
    let previousDescription: string | null = null;
    if (description) {
      metaEl = document.querySelector('meta[name="description"]');
      if (!metaEl) {
        metaEl = document.createElement('meta');
        metaEl.setAttribute('name', 'description');
        document.head.appendChild(metaEl);
      }
      previousDescription = metaEl.getAttribute('content');
      metaEl.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle;
      if (metaEl && previousDescription !== null) {
        metaEl.setAttribute('content', previousDescription);
      }
    };
  }, [title, description]);
}
