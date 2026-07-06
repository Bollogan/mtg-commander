import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resolveCardByName, type CardRef } from '../../../services/cardLinks';

/** A `[[Card Name]]` token or a run of plain text, as split from a body of forum content. */
type Segment = { kind: 'text'; value: string } | { kind: 'card'; name: string };

const CARD_TOKEN = /\[\[([^[\]]+)\]\]/g;

/** Splits text into plain runs and `[[…]]` card mentions, dropping the brackets from the mentions. */
function segment(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(CARD_TOKEN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, start) });
    }
    segments.push({ kind: 'card', name: match[1].trim() });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) });
  }
  return segments;
}

/**
 * A single `[[Card Name]]` mention. Resolves the name against the Scryfall proxy and, once it
 * confirms the card exists, renders a link to that card's page with a hover image preview. While
 * resolving — or if the card isn't found — it falls back to the plain card name so nothing breaks.
 */
function CardMention({ name }: { name: string }) {
  const { t } = useTranslation();
  const [card, setCard] = useState<CardRef | null>(null);

  useEffect(() => {
    let active = true;
    resolveCardByName(name).then((ref) => {
      if (active) setCard(ref);
    });
    return () => { active = false; };
  }, [name]);

  if (!card) return <>{name}</>;

  return (
    <Link
      to={`/card/${card.id}`}
      className="card-link"
      title={t('forums.viewCard', 'View card')}
    >
      {card.name}
      {card.image && (
        <img className="card-link__preview" src={card.image} alt="" loading="lazy" aria-hidden="true" />
      )}
    </Link>
  );
}

interface Props {
  text: string;
  /**
   * When false, card mentions render as styled (non-link) text instead of links. Use this inside an
   * element that is already a link (e.g. a post-row title) to avoid nesting anchors.
   */
  interactive?: boolean;
}

/** Renders forum body text, turning `[[Card Name]]` mentions into links to the card (when it exists). */
export function CardText({ text, interactive = true }: Props) {
  const segments = segment(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') return <Fragment key={i}>{seg.value}</Fragment>;
        if (!interactive) return <span key={i} className="card-mention">{seg.name}</span>;
        return <CardMention key={i} name={seg.name} />;
      })}
    </>
  );
}
