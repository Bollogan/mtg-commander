import axios from 'axios';
import { API_BASE } from '../api/client';
import type { Card } from '../types/cardType';

/** A resolved card reference for a `[[Card Name]]` mention: enough to link and preview it. */
export interface CardRef {
  id: string;
  name: string;
  image: string | null;
}

// Process-wide caches keyed by the normalised name. `cache` holds settled results (a CardRef or
// null when the name doesn't resolve to a real card); `inflight` dedupes concurrent lookups of the
// same name so a body with the card mentioned twice only hits the proxy once.
const cache = new Map<string, CardRef | null>();
const inflight = new Map<string, Promise<CardRef | null>>();

const normalise = (name: string) => name.trim().toLowerCase();

function imageOf(card: Card): string | null {
  return (
    card.image_uris?.normal
    ?? card.card_faces?.[0]?.image_uris?.normal
    ?? (card.id ? `https://api.scryfall.com/cards/${card.id}?format=image&version=normal` : null)
  );
}

/**
 * Resolves a card name to a {@link CardRef} via the public Scryfall proxy (`/api/scryfall/search`),
 * using an exact-name query (`!"…"`) so we only link names that really exist. Returns null (and
 * caches it) when the card can't be found, so unknown mentions render as plain text and aren't retried.
 */
export async function resolveCardByName(name: string): Promise<CardRef | null> {
  const key = normalise(name);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  const existing = inflight.get(key);
  if (existing) return existing;

  const request = (async (): Promise<CardRef | null> => {
    try {
      const { data } = await axios.get<{ cards: Card[] }>(`${API_BASE}/api/scryfall/search`, {
        params: { q: `!"${name.trim()}"` },
      });
      const card = data?.cards?.[0];
      const ref: CardRef | null = card
        ? { id: card.id, name: card.name, image: imageOf(card) }
        : null;
      cache.set(key, ref);
      return ref;
    } catch {
      // Network/proxy error: cache the miss so a broken lookup doesn't spam retries on every render.
      cache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}
