import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      app: {
        title: 'Planeswalkers Tower',
        subtitle: 'Build smarter. Play sharper.'
      },
      nav: {
        search: 'Search',
        commanders: 'Commanders',
        decks: 'Decks',
        language: 'Language'
      },
      search: {
        placeholder: 'Search a card...',
        topTitle: 'Top Commanders',
        resultsTitle: 'Search Results',
        loading: 'Searching the Multiverse...',
        empty: 'No cards found.',
        decksCount: 'Decks: {{count}}'
      },
      commanders: {
        title: 'Find your commander',
        subtitle: 'Browse the most-played commanders or search the legendary pool.'
      },
      advSearch: {
        title: 'Advanced card search',
        subtitle: 'Query every card on Scryfall — colors, type, mana value, set and full syntax.',
        name: 'Card name or text',
        namePlaceholder: 'Lightning, Sol Ring…',
        colors: 'Colors',
        colorMode: 'Color match',
        colorIncluding: 'Including these',
        colorExact: 'Exactly these',
        colorAtMost: 'At most these',
        type: 'Type',
        oracle: 'Rules text contains',
        oraclePlaceholder: 'draw a card',
        format: 'Legal in',
        raw: 'Raw Scryfall syntax',
        rarityCommon: 'Common',
        rarityUncommon: 'Uncommon',
        rarityRare: 'Rare',
        rarityMythic: 'Mythic',
        previewEmpty: 'Add a filter to build your query…',
        reset: 'Clear',
        search: 'Search',
        prev: 'Prev',
        next: 'Next'
      },
      landing: {
        heroTitle: 'Your table for Magic, from first draw to final turn.',
        heroLede: 'Search every card, study the metagame commanders, brew decks with synergy insight, and play them out — all in one tower.',
        ctaExplore: 'Explore cards',
        ctaCommanders: 'Browse commanders',
        scroll: 'Scroll',
        f1Title: 'Search the whole multiverse',
        f1Body: 'A full Scryfall-powered search with advanced filters: colors, type, mana value, set, rules text and raw syntax.',
        f1Cta: 'Open advanced search',
        f2Title: 'Know the commanders',
        f2Body: 'See which commanders define the format and dig into any legendary creature to plan your next build.',
        f2Cta: 'View commanders',
        f3Title: 'Build with insight',
        f3Body: 'Draft decks with a live mana curve, color breakdown and synergy suggestions as you add cards.',
        f3Cta: 'Open the builder',
        f4Title: 'Play it out',
        f4Body: 'Test your list in a real-time table for up to four players, with draws, mulligans and the battlefield.',
        f4Cta: 'Start a game',
        finalTitle: 'Bring your next deck to the table.',
        finalLede: 'Create an account to save decks, follow players and get notified when your events fill up.',
        ctaJoin: 'Create account',
        ctaBuild: 'Start building'
      },
      card: {
        details: 'Card Details',
        related: 'Related & Synergy',
        view: 'View details',
        add: 'Add to deck',
        price: 'Prices',
        release: 'Release',
        notFound: 'Card not found.',
        cmc: 'Mana value',
        set: 'Set',
        rarity: 'Rarity',
        artist: 'Artist',
        colorIdentity: 'Color identity',
        edhrecCategories: 'Top cards by category',
        edhrecSynergy: 'High synergy cards',
        edhrecSynergyFallback: 'EDHREC data not available, showing related cards instead.',
        edhrecEmpty: 'No EDHREC categories available.'
      },
      decks: {
        title: 'My Decks',
        empty: 'Decks view coming soon.'
      }
    }
  },
  es: {
    translation: {
      app: {
        title: 'Planeswalkers Tower',
        subtitle: 'Construye mejor. Juega con ventaja.'
      },
      nav: {
        search: 'Búsqueda',
        commanders: 'Comandantes',
        decks: 'Mazos',
        language: 'Idioma'
      },
      search: {
        placeholder: 'Busca una carta...',
        topTitle: 'Top Comandantes',
        resultsTitle: 'Resultados de búsqueda',
        loading: 'Buscando en el multiverso...',
        empty: 'No se encontraron cartas.',
        decksCount: 'Mazos: {{count}}'
      },
      commanders: {
        title: 'Encuentra tu comandante',
        subtitle: 'Explora los comandantes más jugados o busca en el pool de legendarias.'
      },
      advSearch: {
        title: 'Búsqueda avanzada de cartas',
        subtitle: 'Consulta cualquier carta de Scryfall: colores, tipo, coste de maná, colección y sintaxis completa.',
        name: 'Nombre o texto de la carta',
        namePlaceholder: 'Rayo, Anillo solar…',
        colors: 'Colores',
        colorMode: 'Coincidencia de color',
        colorIncluding: 'Que incluyan',
        colorExact: 'Exactamente estos',
        colorAtMost: 'Como mucho estos',
        type: 'Tipo',
        oracle: 'El texto de reglas contiene',
        oraclePlaceholder: 'roba una carta',
        format: 'Legal en',
        raw: 'Sintaxis Scryfall directa',
        rarityCommon: 'Común',
        rarityUncommon: 'Infrecuente',
        rarityRare: 'Rara',
        rarityMythic: 'Mítica',
        previewEmpty: 'Añade un filtro para construir tu consulta…',
        reset: 'Limpiar',
        search: 'Buscar',
        prev: 'Anterior',
        next: 'Siguiente'
      },
      landing: {
        heroTitle: 'Tu mesa de Magic, del primer robo al último turno.',
        heroLede: 'Busca cualquier carta, estudia los comandantes del metajuego, construye mazos con análisis de sinergia y juégalos, todo en una misma torre.',
        ctaExplore: 'Explorar cartas',
        ctaCommanders: 'Ver comandantes',
        scroll: 'Desliza',
        f1Title: 'Busca en todo el multiverso',
        f1Body: 'Una búsqueda completa sobre Scryfall con filtros avanzados: colores, tipo, coste de maná, colección, texto de reglas y sintaxis directa.',
        f1Cta: 'Abrir búsqueda avanzada',
        f2Title: 'Conoce a los comandantes',
        f2Body: 'Descubre qué comandantes definen el formato y profundiza en cualquier criatura legendaria para planear tu próximo mazo.',
        f2Cta: 'Ver comandantes',
        f3Title: 'Construye con criterio',
        f3Body: 'Diseña mazos con curva de maná en vivo, reparto de colores y sugerencias de sinergia mientras añades cartas.',
        f3Cta: 'Abrir el constructor',
        f4Title: 'Juégalo',
        f4Body: 'Prueba tu lista en una mesa en tiempo real para hasta cuatro jugadores, con robos, mulligans y campo de batalla.',
        f4Cta: 'Empezar partida',
        finalTitle: 'Lleva tu próximo mazo a la mesa.',
        finalLede: 'Crea una cuenta para guardar mazos, seguir a otros jugadores y recibir avisos cuando tus eventos se llenen.',
        ctaJoin: 'Crear cuenta',
        ctaBuild: 'Empezar a construir'
      },
      card: {
        details: 'Detalles de la carta',
        related: 'Relacionadas y sinergia',
        view: 'Ver detalles',
        add: 'Añadir al mazo',
        price: 'Precios',
        release: 'Lanzamiento',
        notFound: 'Carta no encontrada.',
        cmc: 'Valor de maná',
        set: 'Set',
        rarity: 'Rareza',
        artist: 'Artista',
        colorIdentity: 'Identidad de color',
        edhrecCategories: 'Top cartas por categoría',
        edhrecSynergy: 'Cartas con alta sinergia',
        edhrecSynergyFallback: 'No hay datos de EDHREC, mostrando cartas relacionadas.',
        edhrecEmpty: 'No hay categorías de EDHREC disponibles.'
      },
      decks: {
        title: 'Mis Mazos',
        empty: 'Vista de mazos próximamente.'
      }
    }
  }
};

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
