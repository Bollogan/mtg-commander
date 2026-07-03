import { useEffect, useState } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCardByName, fetchMyDecks, type DeckSummary } from '../features/deck/deckSlice';

/** Resolves and caches the commander art (art_crop) used as each tile's blurred background. */
const useDeckCovers = (decks: DeckSummary[]) => {
  const dispatch = useAppDispatch();
  const [covers, setCovers] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    decks.forEach((deck) => {
      const name = deck.commanderName?.trim();
      if (!name || deck.id in covers) return;
      // Mark as in-flight so we don't re-request while it resolves.
      setCovers((prev) => (deck.id in prev ? prev : { ...prev, [deck.id]: null }));
      dispatch(fetchCardByName(name))
        .unwrap()
        .then((card) => {
          if (cancelled) return;
          const art = card.imageUris?.artCrop ?? card.imageUris?.normal ?? null;
          setCovers((prev) => ({ ...prev, [deck.id]: art }));
        })
        .catch(() => undefined);
    });
    return () => { cancelled = true; };
  }, [decks, dispatch, covers]);

  return covers;
};

export const DecksPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { myDecks, status } = useAppSelector((s) => s.deck);
  const userId = useAppSelector((s) => s.auth.userId);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchMyDecks()).finally(() => setLoaded(true));
  }, [dispatch, userId]);

  const covers = useDeckCovers(myDecks);

  // Not signed in → invite to log in (My decks is inherently per-user).
  if (!userId) {
    return (
      <Container className="page-container">
        <div className="page-header"><h1>{t('decks.title')}</h1></div>
        <div className="onboard">
          <span className="grid-empty__glyph" aria-hidden="true">✦</span>
          <h2>{t('decks.signInTitle', 'Sign in to see your decks')}</h2>
          <p>{t('decks.signInHint', 'Your decks are tied to your account. Log in to build and manage them.')}</p>
          <Link to="/login" className="btn btn-primary">{t('nav.login', 'Log in')}</Link>
        </div>
      </Container>
    );
  }

  const loading = status === 'loading' && !loaded && myDecks.length === 0;

  return (
    <Container className="page-container">
      <div className="page-header d-flex justify-content-between align-items-center">
        <h1 className="mb-0">{t('decks.title')}</h1>
        <Link to="/decks/new" className="btn btn-primary">+ {t('builder.new', 'New deck')}</Link>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : myDecks.length === 0 ? (
        <div className="onboard">
          <span className="grid-empty__glyph" aria-hidden="true">✦</span>
          <h2>{t('decks.emptyTitle', "You haven't created any decks yet")}</h2>
          <p>{t('decks.emptyHint', 'Search the multiverse, add cards, and watch your mana curve and synergies update as you go.')}</p>
          <Link to="/decks/new" className="btn btn-primary">{t('decks.createFirst', 'Create your first deck')}</Link>
        </div>
      ) : (
        <div className="deck-tiles">
          {myDecks.map((deck) => {
            const cover = covers[deck.id];
            return (
              <Link key={deck.id} to={`/decks/build/${deck.id}`} className="deck-tile">
                <div
                  className={`deck-tile__art${cover ? '' : ' deck-tile__art--fallback'}`}
                  style={cover ? { backgroundImage: `url(${cover})` } : undefined}
                  aria-hidden="true"
                />
                <div className="deck-tile__body">
                  <h3 className="deck-tile__name">{deck.name}</h3>
                  <div className="deck-tile__meta">
                    <span className="text-capitalize">{deck.format}</span>
                    <span className="deck-tile__dot">·</span>
                    <span>{t('decks.cardCount', '{{count}} cards', { count: deck.totalCards })}</span>
                  </div>
                  {deck.commanderName && (
                    <div className="deck-tile__commander">{deck.commanderName}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
};
