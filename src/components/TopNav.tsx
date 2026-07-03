import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../features/auth/authSlice';
import { NotificationBell } from './social/NotificationBell';
import { LanguageFlag } from './LanguageFlag';

export const TopNav = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userId = useAppSelector((s) => s.auth.userId);
  const displayName = useAppSelector((s) => s.auth.displayName);
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));

  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'en').slice(0, 2);

  const changeLanguage = (lng: string) => {
    void i18n.changeLanguage(lng);
  };

  const langToggle = (
    <span className="lang-toggle">
      <LanguageFlag code={lang} />
      <span className="lang-code">{lang.toUpperCase()}</span>
    </span>
  );

  const onLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="app-navbar">
      <Container>
        <Navbar.Brand as={NavLink} to="/">
          {t('app.title')}
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/search">
              {t('nav.search')}
            </Nav.Link>
            <Nav.Link as={NavLink} to="/commanders">
              {t('nav.commanders')}
            </Nav.Link>
            <Nav.Link as={NavLink} to="/decks">
              {t('nav.decks')}
            </Nav.Link>
            {isAuthenticated && (
              <Nav.Link as={NavLink} to="/decks/build">
                {t('nav.builder')}
              </Nav.Link>
            )}
            {isAuthenticated && (
              <Nav.Link as={NavLink} to="/play">
                {t('nav.play')}
              </Nav.Link>
            )}
            <Nav.Link as={NavLink} to="/forums">
              {t('nav.forums')}
            </Nav.Link>
            <Nav.Link as={NavLink} to="/events">
              {t('nav.events')}
            </Nav.Link>
          </Nav>
          <Nav className="align-items-lg-center">
            <NavDropdown title={langToggle} align="end" className="lang-dropdown">
              <NavDropdown.Item onClick={() => changeLanguage('en')} active={lang === 'en'}>
                <LanguageFlag code="en" /> <span className="lang-code">EN</span> — English
              </NavDropdown.Item>
              <NavDropdown.Item onClick={() => changeLanguage('es')} active={lang === 'es'}>
                <LanguageFlag code="es" /> <span className="lang-code">ES</span> — Español
              </NavDropdown.Item>
            </NavDropdown>
            {isAuthenticated && <NotificationBell />}
            {isAuthenticated ? (
              <NavDropdown title={displayName ?? t('nav.account')} align="end">
                {userId && (
                  <NavDropdown.Item as={NavLink} to={`/users/${userId}`}>
                    {t('nav.profile')}
                  </NavDropdown.Item>
                )}
                <NavDropdown.Item as={NavLink} to="/account">
                  {t('nav.privacy')}
                </NavDropdown.Item>
                <NavDropdown.Item onClick={onLogout}>{t('nav.logout')}</NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Nav.Link as={NavLink} to="/login">
                  {t('nav.login')}
                </Nav.Link>
                <Nav.Link as={NavLink} to="/register">
                  {t('nav.register')}
                </Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};
