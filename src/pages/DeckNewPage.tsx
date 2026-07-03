import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Col, Form, Row, Spinner, Stack } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { apiClient } from '../api/client';
import {
  fetchCategoryTemplates,
  saveDraft,
  type DeckCategory,
  type DeckDraft,
  type DeckVisibility,
} from '../features/deck/deckSlice';
import { rulesFor, FORMATS, type FormatRules } from '../data/formats';
import { CommanderAutocomplete } from '../components/deck/CommanderAutocomplete';

const VISIBILITIES: DeckVisibility[] = ['PRIVATE', 'PUBLIC'];

const DEFAULT_CATEGORIES = [
  'Commander',
  'Ramp',
  'Draw',
  'Removal',
  'Board Wipe',
  'Counterspell',
  'Protection',
  'Recursion',
  'Tutor',
  'Token',
  'Lifegain',
  'Graveyard',
  'Landfall',
  'Theft',
  'Clone',
  'Sac Outlet',
  'Mana Rock',
  'Mana Dork',
  'Cost Reduction',
  'Bombs',
  'Land',
];

export const DeckNewPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, categoryTemplates } = useAppSelector((s) => s.deck);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    dispatch(fetchCategoryTemplates());
  }, [dispatch]);

  const [formats, setFormats] = useState<FormatRules[]>(FORMATS);
  const [name, setName] = useState('');
  const [format, setFormat] = useState('commander');
  const [visibility, setVisibility] = useState<DeckVisibility>('PRIVATE');
  const [description, setDescription] = useState('');
  const [commanderName, setCommanderName] = useState('');
  const [includeDefaultCategories, setIncludeDefaultCategories] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    apiClient.get<FormatRules[]>('/api/decks/formats')
      .then((r) => { if (Array.isArray(r.data) && r.data.length) setFormats(r.data); })
      .catch(() => undefined);
  }, []);

  const formatRules = useMemo(() => rulesFor(format), [format]);
  const requiresCommander = formatRules.requiresCommander;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      next.name = t('newDeck.nameRequired', 'Name must be at least 2 characters.');
    }
    if (requiresCommander && !commanderName.trim()) {
      next.commander = t('newDeck.commanderRequired', 'This format requires a commander.');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const template = categoryTemplates.find((t) => t.id === selectedTemplateId);
    const defaultCategories: DeckCategory[] = template
      ? template.categories.map((c, i) => ({ ...c, order: i }))
      : includeDefaultCategories
        ? DEFAULT_CATEGORIES.map((n, i) => ({ name: n, color: null, icon: null, order: i }))
        : [];

    const draft: DeckDraft = {
      id: null,
      name: name.trim(),
      format,
      visibility,
      description: description.trim(),
      commanderName: requiresCommander ? commanderName.trim() : '',
      cards: [],
      categories: defaultCategories,
    };

    const result = await dispatch(saveDraft(draft));
    if (saveDraft.fulfilled.match(result)) {
      navigate(`/decks/build/${result.payload.id}`);
    }
  };

  return (
    <div className="container py-4">
      <Row className="justify-content-center">
        <Col lg={8} xl={6}>
          <Card className="deck-card">
            <Card.Body>
              <Card.Title as="h1" className="h3 mb-4">
                {t('newDeck.title', 'Create new deck')}
              </Card.Title>

              <Form onSubmit={onSubmit}>
                <Form.Group className="mb-3" controlId="deckName">
                  <Form.Label>{t('builder.deckName', 'Deck name')}</Form.Label>
                  <Form.Control
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    isInvalid={Boolean(errors.name)}
                    placeholder={t('newDeck.namePlaceholder', 'e.g. Mono-Red Aggro')}
                  />
                  <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="deckFormat">
                      <Form.Label>{t('builder.format', 'Format')}</Form.Label>
                      <Form.Select value={format} onChange={(e) => setFormat(e.target.value)}>
                        {formats.map((f) => (
                          <option key={f.format} value={f.format}>{f.label}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="deckVisibility">
                      <Form.Label>{t('builder.visibility', 'Visibility')}</Form.Label>
                      <Form.Select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value as DeckVisibility)}
                      >
                        {VISIBILITIES.map((v) => (
                          <option key={v} value={v}>{t(`builder.vis_${v}`)}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {requiresCommander && (
                  <Form.Group className="mb-3" controlId="deckCommander">
                    <Form.Label>{t('builder.commander', 'Commander')}</Form.Label>
                    <CommanderAutocomplete
                      value={commanderName}
                      onChange={setCommanderName}
                      placeholder={t('newDeck.commanderPlaceholder', 'Search your commander…')}
                    />
                    {errors.commander && (
                      <Form.Text className="text-danger">{errors.commander}</Form.Text>
                    )}
                  </Form.Group>
                )}

                <Form.Group className="mb-3" controlId="deckDescription">
                  <Form.Label>{t('newDeck.description', 'Description')}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('newDeck.descriptionPlaceholder', 'What is this deck about?')}
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="defaultCategories">
                  <Form.Label>{t('newDeck.categoryTemplate', 'Category template')}</Form.Label>
                  <Form.Select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="mb-2"
                  >
                    <option value="">{t('newDeck.defaultCategories', 'Start with default categories')}</option>
                    {categoryTemplates.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </Form.Select>
                  <Form.Check
                    type="checkbox"
                    label={t('newDeck.defaultCategories', 'Start with default categories')}
                    checked={includeDefaultCategories}
                    onChange={(e) => setIncludeDefaultCategories(e.target.checked)}
                    disabled={Boolean(selectedTemplateId)}
                  />
                </Form.Group>

                <Stack direction="horizontal" gap={2} className="justify-content-end">
                  <Button variant="outline-secondary" onClick={() => navigate('/decks')}>
                    {t('newDeck.cancel', 'Cancel')}
                  </Button>
                  <Button variant="primary" type="submit" disabled={status === 'loading'}>
                    {status === 'loading' ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        {t('newDeck.creating', 'Creating…')}
                      </>
                    ) : (
                      t('newDeck.create', 'Create deck')
                    )}
                  </Button>
                </Stack>
              </Form>
            </Card.Body>
          </Card>

          {includeDefaultCategories && (
            <div className="mt-3 text-muted small">
              {t('newDeck.categoriesHint', 'Categories')}: {DEFAULT_CATEGORIES.join(', ')}
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
};
