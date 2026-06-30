import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const DecksPage = () => {
  const { t } = useTranslation();

  return (
    <Container className="page-container">
      <div className="page-header">
        <h1>{t('decks.title')}</h1>
      </div>
      <div className="onboard">
        <span className="grid-empty__glyph" aria-hidden="true">✦</span>
        <h2>Build your first deck</h2>
        <p>
          Search the multiverse, drag cards into your list, and watch your mana curve and
          synergies update as you go.
        </p>
        <Link to="/decks/build" className="btn btn-primary">Open the deck builder</Link>
      </div>
    </Container>
  );
};
