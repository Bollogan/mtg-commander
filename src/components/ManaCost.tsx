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
  C: { cx: 50, cy: 50 }
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
  const symbol = SYMBOL_CENTERS[token];

  if (!symbol) {
    return (
      <span className="mana-token" style={{ width: size, height: size }}>
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
