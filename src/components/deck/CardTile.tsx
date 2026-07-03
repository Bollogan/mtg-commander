import { useNavigate } from 'react-router-dom';

export interface CardTileProps {
  /** Scryfall id of the card (used for navigation to the detail page). */
  scryfallId: string;
  name: string;
  imageUrl: string | null;
  /** Current number of copies in the deck. 0 means the card is not in the deck yet. */
  qty: number;
  width?: number;
  flagged?: boolean;
  disabled?: boolean;
  /** Optional caption under the card (e.g. a suggestion reason). */
  caption?: string;
  /** Label for the add button (i18n-provided by the caller). */
  addLabel?: string;
  /** Add the first copy (the caller resolves the full card when needed). */
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}

/**
 * A single card tile that looks exactly like the cards shown inside a deck
 * (the `.deck-thumb` visual). Reused by the deck views and by the card-search
 * results grid, so the search results and the deck use the same component.
 *
 * When {@link qty} is 0 it shows an "Add" affordance; once the card is in the
 * deck it shows the quantity stepper and a remove button.
 */
export const CardTile = ({
  scryfallId, name, imageUrl, qty, width = 210, flagged, disabled, caption, addLabel = '+ Add',
  onAdd, onInc, onDec, onRemove,
}: CardTileProps) => {
  const navigate = useNavigate();
  const inDeck = qty > 0;

  return (
    <div className={`card-tile${inDeck ? ' is-in-deck' : ''}`}>
      <div
        className={`deck-thumb${flagged ? ' is-flagged' : ''}`}
        style={{ width: '100%', maxWidth: width }}
        onClick={() => navigate(`/card/${scryfallId}`)}
        role="button"
        title={name}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" style={{ aspectRatio: '63 / 88', objectFit: 'cover' }} />
        ) : (
          <div className="deck-thumb__noimg">{name}</div>
        )}
        {qty > 1 && <span className="deck-thumb__qty">{qty}</span>}
        {flagged && <span className="deck-thumb__flag" title="Format issue">!</span>}
      </div>

      <div className="card-tile__controls" onClick={(e) => e.stopPropagation()}>
        {inDeck ? (
          <span className="deck-qty">
            <button type="button" aria-label="one less" disabled={disabled} onClick={onDec}>−</button>
            <span className="deck-qty__n tabular-nums">{qty}</span>
            <button type="button" aria-label="one more" disabled={disabled} onClick={onInc}>+</button>
            <button type="button" aria-label="remove" className="deck-qty__x" disabled={disabled} onClick={onRemove}>×</button>
          </span>
        ) : (
          <button type="button" className="card-tile__add" disabled={disabled} onClick={onAdd}>{addLabel}</button>
        )}
      </div>

      {caption && <div className="card-tile__caption text-muted">{caption}</div>}
    </div>
  );
};
