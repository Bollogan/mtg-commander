import axios from 'axios';
import { type Card } from '../types/cardType';

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

    const rawCards = response.data.data as any[];

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
  } catch (error: any) {
    console.error('Error en Scryfall search:', error.message, error.response?.data);
    if (error.response?.status === 429) {
      console.warn('Rate limit alcanzado. Espera unos segundos.');
    }
    return [];
  }
};

function mapToCard(raw: any): Card {
  return {
    id: raw.id,
    name: raw.name,
    mana_cost: raw.mana_cost,
    cmc: raw.cmc ?? 0,
    colors: raw.colors ?? [],
    color_identity: raw.color_identity ?? [],
    type_line: raw.type_line ?? '',
    oracle_text: raw.oracle_text ?? raw.card_faces?.[0]?.oracle_text,
    power: raw.power,
    toughness: raw.toughness,
    image_uris: raw.image_uris,
    set_name: raw.set_name,
    rarity: raw.rarity,
    legalities: raw.legalities ?? {},
    released_at: raw.released_at,
    artist: raw.artist,
  };
}

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
  const query = 't:legendary t:creature legal:commander';
  try {
    const params = {
      q: query,
      unique: 'cards',
      order: 'edhrec',
      dir: 'asc',
      include_extras: false,
      page: 1,
    };

    const response = await axios.get(`${SC_BASE}/cards/search`, { params });

    const rawCards = response.data.data as any[];
    const topCards = rawCards.slice(0, limit).map(mapToCard);

    console.log(`Top ${limit} Comandantes via EDHREC rank:`, topCards.map(c => c.name));

    return topCards;
  } catch (error) {
    console.error('Error fetching top commanders:', error);
    return [];
  }
};