import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      app: {
        title: 'MTG Deck Builder',
        subtitle: 'Build smarter. Play sharper.'
      },
      nav: {
        search: 'Search',
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
        title: 'MTG Deck Builder',
        subtitle: 'Construye mejor. Juega con ventaja.'
      },
      nav: {
        search: 'Buscar',
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
