import { type Card } from '../types/cardType';
import { useDeckStore } from '../stores/deckStore';

interface CardGridProps {
  cards: Card[];
}

export const CardGrid = ({ cards }: CardGridProps) => {
  const addCard = useDeckStore((state) => state.addCard);

  if (cards.length === 0) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '16px',
        marginTop: '20px',
      }}
    >
      {cards.map((card) => (
        <div
          key={card.id}
          style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#1e1e1e',
            color: 'white',
            textAlign: 'center',
            padding: '8px',
          }}
        >
          {card.image_uris?.normal ? (
            <img
              src={card.image_uris.normal}
              alt={card.name}
              style={{ width: '100%', borderRadius: '4px', marginBottom: '8px' }}
              loading="lazy"
            />
          ) : (
            <div style={{ height: '240px', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Sin imagen
            </div>
          )}

          <h4 style={{ margin: '8px 0 4px', fontSize: '14px' }}>{card.name}</h4>
          <p style={{ fontSize: '12px', margin: '4px 0' }}>
            {card.mana_cost || 'Sin coste'} • CMC {card.cmc}
          </p>

          <button
            onClick={() => addCard(card)}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            + Añadir
          </button>
        </div>
      ))}
    </div>
  );
};