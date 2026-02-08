import { type Card } from '../types/cardType';
import { useDeckStore } from '../stores/deckStore';
import './CardGrid.css';

interface CardGridProps {
  cards: Card[];
  isLoading?: boolean;          // Nueva prop opcional para loading
  isTop?: boolean;              // Opcional: para cambiar texto si es top
}

export const CardGrid = ({ cards, isLoading = false, isTop = false }: CardGridProps) => {
  const addCard = useDeckStore((state) => state.addCard);

  if (isLoading) {
    return (
      <div className="loading-container">
        <p className="loading-text">Invocando los comandantes más poderosos del multiverso...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <p className="empty-message">
        {isTop
          ? 'No se pudieron invocar los top comandantes en este momento.'
          : 'No se encontraron cartas en este plano. Prueba otro término.'}
      </p>
    );
  }

  return (
    <div className="card-grid">
      {cards.map((card) => (
        <div className="card-item" key={card.id}>
          {card.image_uris?.normal ? (
            <img
              src={card.image_uris.normal}
              alt={card.name}
              className="card-image"
              loading="lazy"
            />
          ) : (
            <div className="no-image-placeholder">
              Sin imagen disponible
            </div>
          )}

          <div className="card-info">
            <h4 className="card-name">{card.name}</h4>
            <p className="card-details">
              {card.mana_cost || 'Sin coste'} • CMC {card.cmc}
            </p>

            <button
              onClick={() => addCard(card)}
              className="add-button"
            >
              + Añadir al mazo
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};