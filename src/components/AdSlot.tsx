import { useEffect } from 'react';

/**
 * Google AdSense unit. Renders NOTHING unless both the publisher id (VITE_ADSENSE_CLIENT) and a
 * slot id are configured — so the app never ships empty/broken ad boxes (which also violates
 * AdSense policy). Drop <AdSlot slot={...} /> wherever an ad makes sense.
 *
 * NOTE: Monetizing MTG-branded content with ads has trademark/policy implications — see DEPLOY.md.
 */
const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined; // e.g. ca-pub-1234567890
const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

function ensureAdSenseScript(client: string) {
  if (document.getElementById('adsbygoogle-js')) return;
  const script = document.createElement('script');
  script.id = 'adsbygoogle-js';
  script.async = true;
  script.src = `${ADSENSE_SRC}?client=${client}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

interface AdSlotProps {
  /** AdSense slot id (from your AdSense dashboard). Omit/empty → nothing renders. */
  slot: string | undefined;
  /** AdSense format, defaults to responsive auto. */
  format?: string;
  className?: string;
}

export function AdSlot({ slot, format = 'auto', className }: AdSlotProps) {
  useEffect(() => {
    if (!CLIENT || !slot) return;
    ensureAdSenseScript(CLIENT);
    try {
      const w = window as unknown as { adsbygoogle?: Record<string, unknown>[] };
      w.adsbygoogle = w.adsbygoogle ?? [];
      w.adsbygoogle.push({});
    } catch {
      /* AdSense not ready / blocked — ignore */
    }
  }, [slot]);

  if (!CLIENT || !slot) return null;

  return (
    <aside className={className} aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
