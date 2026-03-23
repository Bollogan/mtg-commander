import { Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

export const DecksPage = () => {
  const { t } = useTranslation();

  return (
    <Container className="page-container">
      <div className="page-header">
        <h1>{t('decks.title')}</h1>
        <p className="text-muted">{t('decks.empty')}</p>
      </div>
    </Container>
  );
};
