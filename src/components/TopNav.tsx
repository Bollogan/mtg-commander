import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const TopNav = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    void i18n.changeLanguage(lng);
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
          </Nav>
          <Nav>
            <NavDropdown title={t('nav.language')} align="end">
              <NavDropdown.Item onClick={() => changeLanguage('en')}>English</NavDropdown.Item>
              <NavDropdown.Item onClick={() => changeLanguage('es')}>Español</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};
