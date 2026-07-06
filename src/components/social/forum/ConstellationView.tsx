import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Thread } from '../../../features/forum/forumSlice';

const CATEGORY_ACCENT: Record<string, string> = {
  GENERAL: '#d8a24a',
  DECK_DISCUSSION: '#4a7fd8',
  RULES: '#d8a24a',
  TRADE: '#4ad88a',
  LORE: '#a24ad8',
  CUSTOM: '#d84a6b',
};

const W = 1000;
const H = 620;

interface Node {
  forum: Thread;
  x: number;
  y: number;
  r: number;
  accent: string;
}

/** Deterministic hash → [0,1), so a forum always lands in the same spot. */
function seeded(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
  }
  return (h % 1000) / 1000;
}

interface Props {
  forums: Thread[];
}

/**
 * A star-map of the forum galaxy (spec §2.1 "Constellation"): each forum is a node sized by member
 * count and lit by weekly activity; faint links connect forums that share a category, so clusters
 * emerge. Hover reveals a label; click warps into the forum.
 */
export function ConstellationView({ forums }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<string | null>(null);

  const nodes = useMemo<Node[]>(() => {
    return forums.map((forum) => {
      const pad = 70;
      const x = pad + seeded(forum.id, 7) * (W - pad * 2);
      const y = pad + seeded(forum.id, 13) * (H - pad * 2);
      const r = 12 + Math.min(28, Math.sqrt(forum.memberCount + 1) * 3 + forum.weeklyActivityScore / 10);
      return { forum, x, y, r, accent: CATEGORY_ACCENT[forum.category ?? 'GENERAL'] ?? '#d8a24a' };
    });
  }, [forums]);

  const links = useMemo(() => {
    const out: Array<{ a: Node; b: Node }> = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        if (nodes[i].forum.category && nodes[i].forum.category === nodes[j].forum.category) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          if (Math.hypot(dx, dy) < 320) out.push({ a: nodes[i], b: nodes[j] });
        }
      }
    }
    return out;
  }, [nodes]);

  if (forums.length === 0) {
    return (
      <div className="grid-empty">
        <span className="grid-empty__glyph" aria-hidden="true">✦</span>
        <p className="mb-0">{t('forums.empty', 'No forums yet. Start the first conversation.')}</p>
      </div>
    );
  }

  return (
    <div className="constellation">
      <svg viewBox={`0 0 ${W} ${H}`} className="constellation__svg" role="img"
           aria-label={t('forums.view.constellation', 'Constellation')}>
        <g className="constellation__links">
          {links.map(({ a, b }, i) => (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ))}
        </g>
        {nodes.map((n) => {
          const active = hovered === n.forum.id;
          return (
            <g
              key={n.forum.id}
              className={`constellation__node${active ? ' is-active' : ''}`}
              transform={`translate(${n.x}, ${n.y})`}
              onMouseEnter={() => setHovered(n.forum.id)}
              onMouseLeave={() => setHovered((h) => (h === n.forum.id ? null : h))}
              onClick={() => navigate(`/forums/${n.forum.id}`)}
              style={{ ['--node-accent' as string]: n.accent }}
            >
              <circle className="constellation__halo" r={n.r + 8} />
              <circle className="constellation__core" r={n.r} />
              {active && (
                <text className="constellation__label" y={-n.r - 12} textAnchor="middle">
                  {n.forum.title}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
