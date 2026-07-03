import { useState } from 'react';
import { Button, Form, Modal, Tab, Tabs } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addCardToDraft, setCardCategory } from '../../features/deck/deckSlice';
import { parseDeckList, resolveImportLines, type ImportSection } from '../../services/deckImportParser';

interface ImportExportModalProps {
  show: boolean;
  onHide: () => void;
}

const sectionToCategory = (section: ImportSection): string | null => {
  switch (section) {
    case 'commander': return 'Commander';
    case 'sideboard': return 'Sideboard';
    case 'companion': return 'Companion';
    default: return null;
  }
};

export const ImportExportModal = ({ show, onHide }: ImportExportModalProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { draft } = useAppSelector((s) => s.deck);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; errors: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState('import');

  const onImport = async () => {
    const lines = parseDeckList(importText);
    if (lines.length === 0) return;
    setImporting(true);
    const result = await resolveImportLines(lines);
    let added = 0;
    for (const item of result.cards) {
      for (let i = 0; i < item.qty; i++) {
        dispatch(addCardToDraft(item.card));
      }
      const category = sectionToCategory(item.section);
      if (category) {
        dispatch(setCardCategory({ scryfallId: item.card.id, category }));
      }
      added += item.qty;
    }
    setImportResult({ added, errors: result.errors });
    setImporting(false);
  };

  const exportText = draft.cards
    .map((c) => `${c.qty} ${c.name}`)
    .join('\n');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportText);
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{t('builder.importExportTitle', 'Import / Export')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k ?? 'import')} className="mb-3">
          <Tab eventKey="import" title={t('builder.importTab', 'Import')}>
            <Form.Group>
              <Form.Label>{t('builder.importInstructions', 'Paste a decklist (one card per line):')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={10}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Commander&#10;1 Atraxa, Praetors' Voice&#10;&#10;Deck&#10;1 Sol Ring&#10;1 Command Tower&#10;96 Forest"
              />
            </Form.Group>
            {importResult && (
              <div className="mt-3">
                <p className="text-success">{t('builder.importAdded', 'Added {{count}} cards', { count: importResult.added })}</p>
                {importResult.errors.length > 0 && (
                  <div className="text-danger small">
                    <p>{t('builder.importErrors', 'Errors:')}</p>
                    <ul>
                      {importResult.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Tab>
          <Tab eventKey="export" title={t('builder.exportTab', 'Export')}>
            <Form.Group>
              <Form.Label>{t('builder.exportInstructions', 'Copy your decklist:')}</Form.Label>
              <Form.Control as="textarea" rows={10} readOnly value={exportText} />
            </Form.Group>
          </Tab>
        </Tabs>
      </Modal.Body>
      <Modal.Footer>
        {activeTab === 'import' ? (
          <Button variant="primary" onClick={onImport} disabled={importing || !importText.trim()}>
            {importing ? t('builder.importing', 'Importing…') : t('builder.importButton', 'Import')}
          </Button>
        ) : (
          <Button variant="primary" onClick={copyToClipboard}>
            {t('builder.copyToClipboard', 'Copy to clipboard')}
          </Button>
        )}
        <Button variant="outline-secondary" onClick={onHide}>
          {t('builder.done', 'Done')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
