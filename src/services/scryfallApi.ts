import axios from 'axios';
import { type Card } from '../types/cardType';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://torresowo.myftp.org:7777/mtg-commander';

export interface SearchResponse {
  cards: Card[];
  page: number;
  pageSize: number;
  totalCards: number;
  hasMore: boolean;
}

export const searchCards = async (query: string, page = 1): Promise<SearchResponse> => {
  try {
    const response = await axios.get<SearchResponse>(`${API_BASE}/api/scryfall/search`, {
      params: { q: query, page },
    });
    return response.data || { cards: [], page, pageSize: 20, totalCards: 0, hasMore: false };
  } catch (error) {
    const err = error as any;
    console.error('Error en Scryfall search:', err.message, err.response?.data);
    if (err.response?.status === 429) {
      console.warn('Rate limit alcanzado. Espera unos segundos.');
    }
    return { cards: [], page, pageSize: 20, totalCards: 0, hasMore: false };
  }
};

export const searchCardsEs = (
  searchTerm: string,
  extraFilters: string = '',
  page = 1
): Promise<SearchResponse> => {
  let q = searchTerm.trim();

  if (!q.includes(':') && !q.includes('"')) {
    q = `"${q}"`;
  }

  q += ' lang:es';
  if (extraFilters) q += ` ${extraFilters}`;

  return searchCards(q, page);
};


export interface EdhrecCategory {
  header: string;
  tag: string;
  cards: Card[];
}

export interface TopCommander {
  card: Card;
  deckCount: number;
}

interface EdhrecCardview {
  id: string;
  name?: string;
}

interface EdhrecCardlist {
  header: string;
  tag: string;
  cardviews?: EdhrecCardview[];
}

interface EdhrecPage {
  container?: {
    json_dict?: {
      cardlists?: EdhrecCardlist[];
    };
  };
}

const EDHREC_BASE = 'https://json.edhrec.com';

async function fetchEdhrecJson(path: string): Promise<EdhrecPage | null> {
  const url = `${EDHREC_BASE}${path}`;
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      return response.json();
    }
  } catch {
    // ignore
  }

  try {
    const fallback = `https://r.jina.ai/http://json.edhrec.com${path}`;
    const response = await fetch(fallback);
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    return JSON.parse(text) as EdhrecPage;
  } catch {
    return null;
  }
}

export async function fetchCardsByIds(ids: string[]): Promise<Card[]> {
  if (!ids.length) {
    return [];
  }

  const response = await axios.post<Card[]>(`${API_BASE}/api/scryfall/cards/collection`, { ids });
  return response.data || [];
}

export async function fetchEdhrecCommanderCategoriesClient(slug: string): Promise<EdhrecCategory[]> {
  const page = await fetchEdhrecJson(`/pages/commanders/${slug}.json`);
  const cardlists = page?.container?.json_dict?.cardlists;
  if (!cardlists?.length) {
    return [];
  }

  const ids = cardlists
    .flatMap(list => list.cardviews || [])
    .map(view => view.id)
    .filter(Boolean);

  if (!ids.length) {
    return cardlists.map(list => ({ header: list.header, tag: list.tag, cards: [] }));
  }

  const cards = await fetchCardsByIds(ids);
  const cardMap = new Map(cards.map(card => [card.id, card]));

  return cardlists.map(list => ({
    header: list.header,
    tag: list.tag,
    cards: (list.cardviews || [])
      .map(view => cardMap.get(view.id))
      .filter((card): card is Card => Boolean(card))
  }));
}

export async function fetchEdhrecTopCommanders(limit = 20): Promise<Card[]> {
  const page = await fetchEdhrecJson('/pages/commanders.json');
  const cardlists = page?.container?.json_dict?.cardlists;
  if (!cardlists?.length) {
    return [];
  }

  const ids = cardlists
    .flatMap(list => list.cardviews || [])
    .map(view => view.id)
    .filter(Boolean)
    .slice(0, limit);

  if (!ids.length) {
    return [];
  }

  const cards = await fetchCardsByIds(ids);
  const cardMap = new Map(cards.map(card => [card.id, card]));
  return ids.map(id => cardMap.get(id)).filter((card): card is Card => Boolean(card));
}

export async function fetchEdhrecCommanderCategories(
  slug: string,
  limit = 0
): Promise<EdhrecCategory[]> {
  const response = await axios.get<EdhrecCategory[]>(
    `${API_BASE}/api/scryfall/edhrec/commanders/${encodeURIComponent(slug)}`,
    { params: { limit } }
  );
  return response.data || [];
}

export const fetchTopCommanders = async (limit = 20): Promise<TopCommander[]> => {
  try {
    const response = await axios.get<TopCommander[]>(`${API_BASE}/api/scryfall/top-commanders`, {
      params: { limit },
    });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching top commanders from Scryfall:', error);
    return [];
  }
};

/** Card recommendations for a commander via the backend recommander.cards proxy. */
export const fetchRecommander = async (commander: string, limit = 20): Promise<Card[]> => {
  if (!commander) {
    return [];
  }
  try {
    const response = await axios.get<Card[]>(`${API_BASE}/api/scryfall/recommander`, {
      params: { commander, limit },
    });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching recommander recommendations:', error);
    return [];
  }
};

export const fetchCardById = async (id: string): Promise<Card | null> => {
  try {
    const response = await axios.get<Card>(`${API_BASE}/api/scryfall/cards/${id}`);
    return response.data || null;
  } catch (error) {
    console.error('Error fetching card by id:', error);
    return null;
  }
};

export const fetchRelatedCards = async (id: string): Promise<Card[]> => {
  try {
    const response = await axios.get<Card[]>(`${API_BASE}/api/scryfall/cards/${id}/related`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching related cards:', error);
    return [];
  }
};