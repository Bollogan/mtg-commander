import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

/** Branded 404 with a way back, so flows never dead-end. */
export const NotFoundPage = () => (
  <Container className="page-container">
    <div className="onboard">
      <span className="error-code">404</span>
      <h2>This page slipped into the graveyard</h2>
      <p>The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Link to="/" className="btn btn-primary">Back to search</Link>
    </div>
  </Container>
);
