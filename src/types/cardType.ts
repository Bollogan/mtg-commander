export interface CardImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

/** One printed face of a double-faced / modal card (transform, MDFC). */
export interface CardFace {
  name?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  image_uris?: CardImageUris;
}

export interface Card {
  id: string;                     // oracle_id o id de printing
  name: string;
  card_faces?: CardFace[];        // presente solo en cartas de doble cara con imagen propia
  mana_cost?: string;             // Scryfall usa mana_cost (con llaves {R}{G})
  cmc: number;                    // Siempre presente en Scryfall
  colors?: string[];              // Array de colores (W, U, B, R, G)
  color_identity?: string[];      // Color identity para Commander
  type_line: string;              // "Creature — Elf Warrior"
  oracle_text?: string;           // Texto oracle (reglas)
  power?: string;
  toughness?: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  set_name?: string;              // Nombre del set (ej. "Modern Horizons 3")
  rarity: string;                 // common, uncommon, rare, mythic
  legalities: {
    [format: string]: string;     // { commander: "legal", standard: "not_legal", ... }
  };
  artist?: string;
  released_at?: string;
  prices?: {
    usd?: string;
    eur?: string;
  };
  related_uris?: {
    [key: string]: string;
  };
}