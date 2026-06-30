import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Stack } from 'react-bootstrap';
import { apiClient } from '../api/client';
import { useAppSelector } from '../store/hooks';

interface EventDto {
  id: string;
  title: string;
  description: string | null;
  format: string;
  organizerName: string;
  capacity: number;
  spotsLeft: number;
  participantCount: number;
  status: 'OPEN' | 'FULL' | 'CLOSED';
  startsAt: string | null;
}

export const EventsPage = () => {
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.token));
  const [events, setEvents] = useState<EventDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState('commander');
  const [capacity, setCapacity] = useState(8);

  const load = async () => {
    try {
      const { data } = await apiClient.get<EventDto[]>('/api/events');
      setEvents(data);
    } catch {
      setError('Could not load events.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async () => {
    if (!title.trim()) return;
    setError(null);
    try {
      await apiClient.post('/api/events', { title, format, capacity });
      setTitle('');
      await load();
    } catch {
      setError('Could not create the event.');
    }
  };

  const onRegister = async (id: string) => {
    setError(null);
    try {
      await apiClient.post(`/api/events/${id}/register`);
      await load();
    } catch {
      setError('Could not register (the event may be full).');
    }
  };

  const statusVariant = (s: EventDto['status']) =>
    s === 'OPEN' ? 'success' : s === 'FULL' ? 'warning' : 'secondary';

  return (
    <Container className="page-container">
      <div className="page-header" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
        <h1>Community events</h1>
        <p className="text-muted mb-0">Find tournaments and casual pods, or organize your own.</p>
      </div>
      {error && <Alert variant="warning" onClose={() => setError(null)} dismissible>{error}</Alert>}

      {!isAuthenticated && (
        <p className="text-muted">
          <Link to="/login">Log in</Link> to organize events or register for a seat.
        </p>
      )}

      {isAuthenticated && (
        <Card className="deck-card mb-4">
          <Card.Body>
            <Card.Title>Organize an event</Card.Title>
            <Row className="g-2 align-items-end">
              <Col md={5}>
                <Form.Label>Title</Form.Label>
                <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} />
              </Col>
              <Col md={3}>
                <Form.Label>Format</Form.Label>
                <Form.Control value={format} onChange={(e) => setFormat(e.target.value)} />
              </Col>
              <Col md={2}>
                <Form.Label>Capacity</Form.Label>
                <Form.Control
                  type="number"
                  min={2}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </Col>
              <Col md={2}>
                <Button variant="success" onClick={onCreate}>Create</Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      <Row>
        {events.map((ev) => (
          <Col md={6} lg={4} key={ev.id} className="mb-3">
            <Card className="deck-card h-100">
              <Card.Body>
                <Stack direction="horizontal" gap={2} className="mb-1">
                  <Card.Title className="mb-0">{ev.title}</Card.Title>
                  <Badge bg={statusVariant(ev.status)} className="ms-auto">{ev.status}</Badge>
                </Stack>
                <div className="text-muted small mb-2">
                  {ev.format} · by {ev.organizerName}
                </div>
                <p className="small">{ev.description}</p>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">
                    {ev.participantCount}/{ev.capacity} · {ev.spotsLeft} spots left
                  </span>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    disabled={!isAuthenticated || ev.status !== 'OPEN'}
                    onClick={() => onRegister(ev.id)}
                  >
                    Register
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      {events.length === 0 && (
        <div className="grid-empty">
          <span className="grid-empty__glyph" aria-hidden="true">✦</span>
          <p className="mb-0">No events scheduled yet. Be the first to organize one.</p>
        </div>
      )}
    </Container>
  );
};
