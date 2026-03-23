import { useState } from 'react';
import { Button, Container, Nav, Navbar, Offcanvas } from 'react-bootstrap';

interface SidebarProps {
  currentView: 'search' | 'decks' | 'new-deck';
  onViewChange: (view: 'search' | 'decks' | 'new-deck') => void;
}

export const Sidebar = ({ currentView, onViewChange }: SidebarProps) => {
  const [show, setShow] = useState(false);

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="app-navbar" sticky="top">
      <Container fluid>
        <Navbar.Brand>MTG Builder</Navbar.Brand>
        <Navbar.Toggle aria-controls="mtg-offcanvas" onClick={() => setShow(true)} />
        <Navbar.Offcanvas
          id="mtg-offcanvas"
          placement="start"
          show={show}
          onHide={() => setShow(false)}
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>MTG Builder</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <Nav className="flex-column gap-2">
              <Button
                variant={currentView === 'search' ? 'warning' : 'outline-light'}
                onClick={() => {
                  onViewChange('search');
                  setShow(false);
                }}
              >
                🔍 Buscar Cartas
              </Button>
              <Button
                variant={currentView === 'decks' ? 'warning' : 'outline-light'}
                onClick={() => {
                  onViewChange('decks');
                  setShow(false);
                }}
              >
                📚 Mis Mazos
              </Button>
              <Button
                variant={currentView === 'new-deck' ? 'warning' : 'outline-light'}
                onClick={() => {
                  onViewChange('new-deck');
                  setShow(false);
                }}
              >
                ➕ Nuevo Mazo
              </Button>
              <div className="mt-3 pt-3 border-top border-secondary">
                <Button variant="outline-info" className="w-100">
                  👤 Inicia sesión
                </Button>
              </div>
            </Nav>
          </Offcanvas.Body>
        </Navbar.Offcanvas>
      </Container>
    </Navbar>
  );
};