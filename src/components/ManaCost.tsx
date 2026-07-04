import ManaSprite from '../assets/Mana.svg';

const SPRITE = {
  minX: -945,
  minY: -210,
  width: 1045,
  height: 730,
  size: 100
};

const SYMBOL_CENTERS: Record<string, { cx: number; cy: number }> = {
  W: { cx: -475, cy: 50 },
  U: { cx: -370, cy: 50 },
  B: { cx: -265, cy: 50 },
  R: { cx: -160, cy: 50 },
  G: { cx: -55, cy: 50 },
  // NOTE: {C} colorless is handled separately below — this old sprite predates the 2016
  // colorless symbol, so its grey pip at (50,50) is actually the SNOW symbol, not colorless.
  // Generic/colorless mana {0}–{9}: official grey pips on the sprite's top row (cy = -160),
  // laid out left→right (cx = -895 + digit*105). This is the official symbol, matching WUBRG.
  '0': { cx: -895, cy: -160 },
  '1': { cx: -790, cy: -160 },
  '2': { cx: -685, cy: -160 },
  '3': { cx: -580, cy: -160 },
  '4': { cx: -475, cy: -160 },
  '5': { cx: -370, cy: -160 },
  '6': { cx: -265, cy: -160 },
  '7': { cx: -160, cy: -160 },
  '8': { cx: -55, cy: -160 },
  '9': { cx: 50, cy: -160 },
};

interface ManaCostProps {
  manaCost?: string;
  size?: number;
}

const getTokens = (manaCost?: string) => {
  if (!manaCost) return [];
  return manaCost
    .match(/\{([^}]+)\}/g)
    ?.map(token => token.replace(/[{}]/g, ''))
    ?? [];
};

const renderSymbol = (token: string, size: number) => {
  // Colourless {C}: the official grey disc with a faceted diamond. Drawn inline because the
  // sprite is pre-2016 and has no colourless glyph (its grey pip there is the snow symbol).
  if (token === 'C') {
    return (
      <svg className="mana-icon" viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="colorless">
        <circle cx="50" cy="50" r="49" fill="#cbc6bf" stroke="#8c857c" strokeWidth="2" />
        <path d="M50 20 L72 50 L50 80 L28 50 Z" fill="#17140f" />
        <path d="M50 33 L61 50 L50 67 L39 50 Z" fill="#a49d92" />
      </svg>
    );
  }

  const symbol = SYMBOL_CENTERS[token];

  if (!symbol) {
    // Generic/colorless mana ({0}..{20}, {X}, {Y}, {Z}, {∞}) and any other token the sprite
    // doesn't cover render as an official-looking grey circle with the value inside.
    const isGeneric = /^(\d+|[XYZ]|½|∞)$/i.test(token);
    return (
      <span
        className={`mana-token${isGeneric ? ' mana-token--generic' : ''}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.62) }}
      >
        {token}
      </span>
    );
  }

  const viewBox = `${symbol.cx - SPRITE.size / 2} ${symbol.cy - SPRITE.size / 2} ${SPRITE.size} ${SPRITE.size}`;

  return (
    <svg
      className="mana-icon"
      viewBox={viewBox}
      width={size}
      height={size}
      role="img"
      aria-label={token}
    >
      <image
        href={ManaSprite}
        x={SPRITE.minX}
        y={SPRITE.minY}
        width={SPRITE.width}
        height={SPRITE.height}
      />
    </svg>
  );
};

/** A single official Magic mana symbol (reuses the sprite). Falls back to a token chip. */
export const ManaSymbol = ({ token, size = 22 }: { token: string; size?: number }) => (
  <span className="mana-cost">{renderSymbol(token.toUpperCase(), size)}</span>
);

export const ManaCost = ({ manaCost, size = 22 }: ManaCostProps) => {
  const tokens = getTokens(manaCost);

  if (!tokens.length) {
    return null;
  }

  return (
    <span className="mana-cost">
      {tokens.map((token, index) => (
        <span key={`${token}-${index}`}>{renderSymbol(token, size)}</span>
      ))}
    </span>
  );
};
