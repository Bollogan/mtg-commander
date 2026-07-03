/**
 * Small inline-SVG flags for the language switcher. Emoji flags (🇬🇧/🇪🇸) don't render as flags
 * on Windows, so we draw simple, recognizable SVGs instead.
 */
export const LanguageFlag = ({ code, size = 20 }: { code: string; size?: number }) => {
  const lang = code.slice(0, 2).toLowerCase();

  const svg =
    lang === 'es' ? (
      <svg viewBox="0 0 3 2" width="100%" height="100%" preserveAspectRatio="none">
        <rect width="3" height="2" fill="#c60b1e" />
        <rect y="0.5" width="3" height="1" fill="#ffc400" />
      </svg>
    ) : (
      // English → Union Jack (simplified for small sizes).
      <svg viewBox="0 0 60 30" width="100%" height="100%" preserveAspectRatio="none">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 60,30 M60,0 0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 60,30 M60,0 0,30" stroke="#c8102e" strokeWidth="3" />
        <rect x="25" width="10" height="30" fill="#fff" />
        <rect y="10" width="60" height="10" fill="#fff" />
        <rect x="27" width="6" height="30" fill="#c8102e" />
        <rect y="12" width="60" height="6" fill="#c8102e" />
      </svg>
    );

  return (
    <span
      className="lang-flag"
      aria-hidden="true"
      style={{ width: size, height: Math.round((size * 2) / 3) }}
    >
      {svg}
    </span>
  );
};
