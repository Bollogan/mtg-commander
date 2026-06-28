import { useState, type MouseEvent } from 'react';
import { type Card } from '../types/cardType';

interface FlipCardProps {
  card: Card;
  /** Called when the card art (not the flip button) is clicked — e.g. navigate to detail. */
  onImageClick?: () => void;
}

const faceImage = (uris?: Card['image_uris']) => uris?.large ?? uris?.normal ?? uris?.small ?? '';

/**
 * Renders a card image. For double-faced cards (two faces each with their own art) it shows a
 * flip control and a 3D flip animation between front and back — like Scryfall / Archidekt.
 */
export const FlipCard = ({ card, onImageClick }: FlipCardProps) => {
  const [flipped, setFlipped] = useState(false);

  const faces = card.card_faces?.filter((f) => f.image_uris) ?? [];
  const twoFaced = faces.length >= 2;

  const fallback = card.id
    ? `https://api.scryfall.com/cards/${card.id}?format=image&version=large`
    : '';
  const frontSrc = twoFaced ? faceImage(faces[0].image_uris) : (faceImage(card.image_uris) || fallback);
  const backSrc = twoFaced ? faceImage(faces[1].image_uris) : '';

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    setFlipped((v) => !v);
  };

  if (!frontSrc) {
    return <div className="no-image">No image</div>;
  }

  if (!twoFaced) {
    return (
      <img
        src={frontSrc}
        alt={card.name}
        className="card-image"
        onClick={onImageClick}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`flip-card${flipped ? ' is-flipped' : ''}`}>
      <div className="flip-card__inner">
        <div className="flip-card__face flip-card__face--front">
          <img src={frontSrc} alt={faces[0].name ?? card.name} onClick={onImageClick} loading="lazy" />
        </div>
        <div className="flip-card__face flip-card__face--back">
          <img src={backSrc} alt={faces[1].name ?? card.name} onClick={onImageClick} loading="lazy" />
        </div>
      </div>
      <button
        type="button"
        className="flip-btn"
        onClick={toggle}
        title="Girar carta"
        aria-label="Girar carta de doble cara"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 9a8 8 0 0 1 13.4-3.4L20 8M20 15a8 8 0 0 1-13.4 3.4L4 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M20 4v4h-4M4 20v-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
};
