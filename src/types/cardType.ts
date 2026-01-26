export interface Card {
  id: string;                     // oracle_id o id de printing
  name: string;
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
}