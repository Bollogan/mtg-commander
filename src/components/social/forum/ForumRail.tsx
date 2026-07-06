import type { Thread } from '../../../features/forum/forumSlice';
import { ForumCard } from './ForumCard';

interface Props {
  title: string;
  glyph: string;
  subtitle?: string;
  forums: Thread[];
}

/** A horizontal, snap-scrolling rail of forum cards (Trending / Rising / New). */
export function ForumRail({ title, glyph, subtitle, forums }: Props) {
  if (forums.length === 0) return null;
  return (
    <section className="forum-rail">
      <header className="forum-rail__head">
        <h2 className="forum-rail__title">
          <span className="forum-rail__glyph" aria-hidden="true">{glyph}</span>
          {title}
        </h2>
        {subtitle && <p className="forum-rail__subtitle">{subtitle}</p>}
      </header>
      <div className="forum-rail__track">
        {forums.map((f) => (
          <div key={f.id} className="forum-rail__item">
            <ForumCard forum={f} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
