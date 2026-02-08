import { useDeckStore } from '../stores/deckStore';

export const DeckZone = () => {
  const { decks, currentDeckId, createDeck } = useDeckStore();

  const currentDeck = decks.find((d) => d.id === currentDeckId);

  if (!currentDeck) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', background: '#2a2a2a', borderRadius: '8px' }}>
        <h3>No hay mazo seleccionado</h3>
        <p>Crea uno para empezar a construir tu deck Commander.</p>
        <button
          onClick={() => createDeck('Nuevo Mazo Commander')}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '16px',
            fontSize: '16px',
          }}
        >
          Crear Nuevo Mazo
        </button>
      </div>
    );
  }

  const { commander, main, sideboard, maybeboard, name } = currentDeck;

  const totalCards = main.reduce((sum, c) => sum + c.quantity, 0) +
                    sideboard.reduce((sum, c) => sum + c.quantity, 0) +
                    maybeboard.reduce((sum, c) => sum + c.quantity, 0) +
                    (commander ? commander.quantity : 0);

  return (
    <div style={{ marginTop: '40px' }}>
      <h2>{name} ({totalCards} cartas)</h2>

      {/* Comandante destacado */}
      {commander && (
        <div style={{ marginBottom: '24px', padding: '16px', background: '#3a3a3a', borderRadius: '8px' }}>
          <h3>Comandante</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {commander.card.image_uris?.small && (
              <img src={commander.card.image_uris.small} alt={commander.card.name} style={{ width: '80px', borderRadius: '6px' }} />
            )}
            <div>
              <strong>{commander.card.name}</strong>
              <div style={{ fontSize: '12px', color: '#aaa' }}>{commander.card.type_line}</div>
            </div>
          </div>
        </div>
      )}

      {/* Maindeck */}
      <h3>Maindeck ({main.reduce((s, c) => s + c.quantity, 0)})</h3>
      {main.length > 0 ? (
        main.map((entry) => (
          <div key={entry.card.id} style={{ margin: '8px 0', padding: '8px', background: '#1e1e1e', borderRadius: '6px' }}>
            {entry.quantity}× {entry.card.name}
          </div>
        ))
      ) : (
        <p style={{ color: '#888' }}>Aún sin cartas en el maindeck.</p>
      )}

      {/* Sideboard y Maybeboard (puedes colapsar con <details> o librería) */}
      {/* ... similar para sideboard y maybeboard ... */}

    </div>
  );
};