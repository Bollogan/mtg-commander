import { useEffect, useState } from 'react';
import { Button, Form, InputGroup, ListGroup, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addCategory,
  createCategoryTemplate,
  deleteCategoryTemplate,
  fetchCategoryTemplates,
  removeCategory,
  renameCategory,
  setCategories,
  type DeckCategory,
} from '../../features/deck/deckSlice';

const DEFAULT_COLORS = [
  '#d8a24a', '#4a90d8', '#5ad84a', '#d84a4a', '#9b4ad8', '#4ad8c9', '#d84a9b', '#7f8c8d',
];

const DEFAULT_ICONS = ['◆', '●', '■', '▲', '★', '✦', '⚔', '⚙'];

export const CategoryManager = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { draft, categoryTemplates } = useAppSelector((s) => s.deck);
  const [show, setShow] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_ICONS[0]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    if (show) dispatch(fetchCategoryTemplates());
  }, [dispatch, show]);

  const onAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    dispatch(addCategory({
      name: trimmed,
      color: selectedColor,
      icon: selectedIcon,
      order: draft.categories.length,
    }));
    setNewName('');
  };

  const startEdit = (cat: DeckCategory) => {
    setEditing(cat.name);
    setEditName(cat.name);
  };

  const confirmEdit = (oldName: string) => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== oldName) {
      dispatch(renameCategory({ oldName, newName: trimmed }));
    }
    setEditing(null);
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...draft.categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    dispatch(setCategories(next.map((c, i) => ({ ...c, order: i }))));
  };

  const onSaveTemplate = () => {
    const trimmed = templateName.trim();
    if (!trimmed || draft.categories.length === 0) return;
    dispatch(createCategoryTemplate({ name: trimmed, categories: draft.categories }));
    setTemplateName('');
  };

  const onLoadTemplate = (templateId: string) => {
    const template = categoryTemplates.find((t) => t.id === templateId);
    if (template) {
      dispatch(setCategories(template.categories.map((c, i) => ({ ...c, order: i }))));
    }
  };

  return (
    <>
      <Button variant="outline-primary" size="sm" onClick={() => setShow(true)}>
        {t('builder.manageCategories', 'Categories')}
      </Button>

      <Modal show={show} onHide={() => setShow(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('builder.categoryManagerTitle', 'Manage categories')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row">
            <div className="col-md-6">
              <InputGroup className="mb-3">
                <Form.Control
                  placeholder={t('builder.newCategoryName', 'New category name')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onAdd()}
                />
                <Button variant="success" onClick={onAdd}>+</Button>
              </InputGroup>

              <div className="mb-3 d-flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`btn btn-sm ${selectedColor === c ? 'border border-2 border-white' : ''}`}
                    style={{ backgroundColor: c, width: 28, height: 28, borderRadius: '50%' }}
                    onClick={() => setSelectedColor(c)}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>

              <div className="mb-3 d-flex gap-2 flex-wrap">
                {DEFAULT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`btn btn-sm ${selectedIcon === icon ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setSelectedIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              <ListGroup variant="flush">
                {draft.categories.map((cat, idx) => (
                  <ListGroup.Item key={cat.name} className="d-flex align-items-center gap-2">
                    <span style={{ color: cat.color ?? 'inherit' }}>{cat.icon ?? '◆'}</span>
                    {editing === cat.name ? (
                      <Form.Control
                        size="sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => confirmEdit(cat.name)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEdit(cat.name);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="flex-grow-1" onClick={() => startEdit(cat)} role="button">
                        {cat.name}
                      </span>
                    )}
                    <Button size="sm" variant="outline-secondary" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => move(idx, 1)} disabled={idx === draft.categories.length - 1}>↓</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => dispatch(removeCategory(cat.name))}>×</Button>
                  </ListGroup.Item>
                ))}
                {draft.categories.length === 0 && (
                  <ListGroup.Item className="text-muted">
                    {t('builder.noCategories', 'No custom categories yet.')}
                  </ListGroup.Item>
                )}
              </ListGroup>
            </div>

            <div className="col-md-6">
              <h6 className="mt-3 mt-md-0">{t('builder.templates', 'Templates')}</h6>
              <InputGroup className="mb-3">
                <Form.Control
                  placeholder={t('builder.templateName', 'Template name')}
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSaveTemplate()}
                />
                <Button variant="outline-success" onClick={onSaveTemplate} disabled={draft.categories.length === 0}>
                  {t('builder.saveTemplate', 'Save')}
                </Button>
              </InputGroup>

              <ListGroup variant="flush">
                {categoryTemplates.map((template) => (
                  <ListGroup.Item key={template.id} className="d-flex justify-content-between align-items-center">
                    <span role="button" onClick={() => onLoadTemplate(template.id)}>
                      {template.name}
                      <span className="text-muted small ms-2">({template.categories.length})</span>
                    </span>
                    {!template.global && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => dispatch(deleteCategoryTemplate(template.id))}
                      >
                        ×
                      </Button>
                    )}
                  </ListGroup.Item>
                ))}
                {categoryTemplates.length === 0 && (
                  <ListGroup.Item className="text-muted">
                    {t('builder.noTemplates', 'No templates yet.')}
                  </ListGroup.Item>
                )}
              </ListGroup>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShow(false)}>
            {t('builder.done', 'Done')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
