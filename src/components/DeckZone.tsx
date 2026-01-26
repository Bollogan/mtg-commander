import { useDeckStore } from '../stores/deckStore';

export const DeckZone = () => {
  const { deck, removeCard, updateQuantity, totalCards } = useDeckStore();

  // Calculamos un CMC promedio simple (solo cartas no-tierra por ahora)
  const nonLandCards = deck.filter((entry) => !entry.card.type_line?.toLowerCase().includes('land'));
  const totalNonLand = nonLandCards.reduce((sum, entry) => sum + entry.quantity, 0);
  const avgCmc = nonLandCards.reduce((sum, entry) => sum + (entry.card.cmc * entry.quantity), 0) / (totalNonLand || 1);

  if (deck.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', background: '#2a2a2a', borderRadius: '8px' }}>
        <h3>Tu mazo está vacío</h3>
        <p>Añade cartas desde la búsqueda para empezar a construir tu deck.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '40px' }}>
      <h2>Tu Mazo ({totalCards()} cartas)</h2>
      <p style={{ color: '#aaa', fontSize: '14px' }}>
        Promedio CMC (sin tierras): {avgCmc.toFixed(2)}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {deck.map((entry) => (
          <div
            key={`${entry.card.id}-${entry.category || 'main'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#1e1e1e',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #444',
            }}
          >
            {/* Miniatura pequeña */}
            {entry.card.image_uris?.small && (
              <img
                src={entry.card.image_uris.small}
                alt={entry.card.name}
                style={{ width: '60px', borderRadius: '4px', marginRight: '16px' }}
              />
            )}

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{entry.card.name}</div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>
                {entry.card.mana_cost} • {entry.card.type_line?.split(' — ')[0]}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => updateQuantity(entry.card.name, entry.quantity - 1)}
                disabled={entry.quantity <= 1}
                style={{
                  background: '#555',
                  color: 'white',
                  border: 'none',
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  cursor: entry.quantity > 1 ? 'pointer' : 'not-allowed',
                }}
              >
                -
              </button>

              <span style={{ minWidth: '30px', textAlign: 'center' }}>{entry.quantity}</span>

              <button
                onClick={() => updateQuantity(entry.card.name, entry.quantity + 1)}
                style={{
                  background: '#555',
                  color: 'white',
                  border: 'none',
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                +
              </button>

              <button
                onClick={() => removeCard(entry.card.name)}
                style={{
                  background: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginLeft: '16px',
                }}
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};