import axios from 'axios';
import { type Card } from '../types/cardType';
import { mapToCard } from '../utils/mapToCard';

const SC_BASE = 'https://api.scryfall.com';

export const searchCards = async (query: string): Promise<Card[]> => {
  try {
    const params = {
      q: query,
      unique: 'prints',
      order: 'released',
      dir: 'desc',
      include_extras: false,
      include_variations: false,
      page: 1,
    };

    const response = await axios.get(`${SC_BASE}/cards/search`, { params });

    if (response.data.object !== 'list') {
      console.warn('Respuesta no es una lista:', response.data);
      return [];
    }

    const rawCards = response.data.data;

    const uniqueByName = new Map<string, Card>();

    for (const raw of rawCards) {
      const nameKey = raw.name.toLowerCase().trim();
      if (!uniqueByName.has(nameKey)) {
        uniqueByName.set(nameKey, mapToCard(raw));
      }
    }

    const result = Array.from(uniqueByName.values());

    console.log(`Scryfall: "${query}" → ${rawCards.length} prints → ${result.length} únicas`);

    return result;
  } catch (error) {
    const err = error as any;
    console.error('Error en Scryfall search:', err.message, err.response?.data);
    if (err.response?.status === 429) {
      console.warn('Rate limit alcanzado. Espera unos segundos.');
    }
    return [];
  }
};

export const searchCardsEs = (searchTerm: string, extraFilters: string = ''): Promise<Card[]> => {
  let q = searchTerm.trim();

  if (!q.includes(':') && !q.includes('"')) {
    q = `"${q}"`;
  }

  q += ' lang:es';
  if (extraFilters) q += ` ${extraFilters}`;

  return searchCards(q);
};

export const fetchTopCommanders = async (limit = 20): Promise<Card[]> => {
  try {
    const params = {
      q: 't:legendary t:creature legal:commander -is:funny',
      unique: 'cards',
      order: 'edhrec',
      dir: 'asc',
      include_extras: false,
      include_variations: false,
    };

    const response = await axios.get('https://api.scryfall.com/cards/search', { params });
    const rawCards = response.data.data || [];

    const mapped = rawCards
      .slice(0, limit)
      .map(mapToCard);

    console.log('Top comandantes vía Scryfall EDHREC order:', mapped.map(c => c.name));

    return mapped;
  } catch (error) {
    console.error('Error fetching top commanders from Scryfall:', error);
    return [];
  }
};