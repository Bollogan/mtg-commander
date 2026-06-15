import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../features/auth/authSlice';
import { NotificationBell } from './social/NotificationBell';

export const TopNav = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userId = useAppSelector((s) => s.auth.userId);
  const displayName = useAppSelector((s) => s.auth.displayName);
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));

  const changeLanguage = (lng: string) => {
    void i18n.changeLanguage(lng);
  };

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
            <Nav.Link as={NavLink} to="/" end>
              {t('nav.search')}
            </Nav.Link>
            <Nav.Link as={NavLink} to="/decks">
              {t('nav.decks')}
            </Nav.Link>
            <Nav.Link as={NavLink} to="/forums">
              Forums
            </Nav.Link>
          </Nav>
          <Nav className="align-items-lg-center">
            <NavDropdown title={t('nav.language')} align="end">
              <NavDropdown.Item onClick={() => changeLanguage('en')}>English</NavDropdown.Item>
              <NavDropdown.Item onClick={() => changeLanguage('es')}>Español</NavDropdown.Item>
            </NavDropdown>
            {isAuthenticated && <NotificationBell />}
            {isAuthenticated ? (
              <NavDropdown title={displayName ?? 'Account'} align="end">
                {userId && (
                  <NavDropdown.Item as={NavLink} to={`/users/${userId}`}>
                    My profile
                  </NavDropdown.Item>
                )}
                <NavDropdown.Item onClick={onLogout}>Logout</NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav.Link as={NavLink} to="/login">
                Login
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};
