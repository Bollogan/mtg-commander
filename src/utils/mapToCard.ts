import { type Card } from '../types/cardType';

export function mapToCard(raw: any): Card {
  return {
    id: raw.id || raw.oracle_id || 'unknown',
    name: raw.name || 'Unknown Card',
    mana_cost: raw.mana_cost || raw.card_faces?.[0]?.mana_cost || '',
    cmc: raw.cmc ?? raw.card_faces?.[0]?.cmc ?? 0,
    colors: raw.colors ?? raw.card_faces?.[0]?.colors ?? [],
    color_identity: raw.color_identity ?? raw.card_faces?.[0]?.color_identity ?? [],
    type_line: raw.type_line || raw.card_faces?.[0]?.type_line || '',
    oracle_text: raw.oracle_text || raw.card_faces?.[0]?.oracle_text || raw.flavor_text || '',
    power: raw.power || raw.card_faces?.[0]?.power,
    toughness: raw.toughness || raw.card_faces?.[0]?.toughness,
    image_uris: raw.image_uris || raw.card_faces?.[0]?.image_uris || undefined,
    set_name: raw.set_name || raw.set || 'Unknown Set',
    rarity: raw.rarity || 'unknown',
    legalities: raw.legalities || {},
    artist: raw.artist,
    released_at: raw.released_at || undefined,
    prices: raw.prices || { usd: undefined, eur: undefined },
  };
}
