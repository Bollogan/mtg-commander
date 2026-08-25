import { useState } from 'react';
import { Button, Form, Modal, Tab, Tabs } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addCardsToDraft, setDraftMeta } from '../../features/deck/deckSlice';
import {
  parseDeckList, resolveImportLines, type ImportResult, type ImportSection,
} from '../../services/deckImportParser';

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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [added, setAdded] = useState(0);
  const [activeTab, setActiveTab] = useState('import');

  const onImport = async () => {
    const lines = parseDeckList(importText);
    if (lines.length === 0) {
      setAdded(0);
      setImportResult({
        cards: [],
        errors: [t('builder.importNothingParsed', 'No card lines found in that text.')],
      });
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const result = await resolveImportLines(lines);

      // The maybeboard is a wish list, not part of the deck — parse it, but don't import it.
      const importable = result.cards.filter((item) => item.section !== 'maybeboard');

      dispatch(addCardsToDraft(importable.map((item) => ({
        card: item.card,
        qty: item.qty,
        category: sectionToCategory(item.section),
      }))));

      // A Commander section also names the deck's commander, which drives colour-identity
      // validation and the recommendation panels.
      const commander = importable.find((item) => item.section === 'commander');
      if (commander && !draft.commanderName) {
        dispatch(setDraftMeta({ commanderName: commander.card.name }));
      }

      setAdded(importable.reduce((sum, item) => sum + item.qty, 0));
      setImportResult(result);
    } finally {
      setImporting(false);
    }
  };

  // Export in the same sectioned shape the importer reads back, so a round trip is lossless.
  const exportText = (() => {
    const sections: [string, (category: string | null) => boolean][] = [
      ['Commander', (c) => c === 'Commander'],
      ['Deck', (c) => c !== 'Commander' && c !== 'Sideboard' && c !== 'Companion'],
      ['Companion', (c) => c === 'Companion'],
      ['Sideboard', (c) => c === 'Sideboard'],
    ];
    return sections
      .map(([header, belongs]) => {
        const cards = draft.cards.filter((c) => belongs(c.category));
        return cards.length === 0
          ? null
          : [header, ...cards.map((c) => `${c.qty} ${c.name}`)].join('\n');
      })
      .filter(Boolean)
      .join('\n\n');
  })();

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
                {importResult.failure ? (
                  <p className="text-danger mb-0">
                    {t('builder.importUnavailable',
                      'Could not reach the card database, so nothing was imported. This is a server problem, not a problem with your list — try again in a moment.')}
                  </p>
                ) : (
                  <p className="text-success">{t('builder.importAdded', 'Added {{count}} cards', { count: added })}</p>
                )}
                {!importResult.failure && importResult.errors.length > 0 && (
                  <div className="text-danger small">
                    <p>{t('builder.importErrors', 'Errors:')}</p>
                    <ul>
                      {importResult.errors.slice(0, 10).map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                    {importResult.errors.length > 10 && (
                      <p className="mb-0">
                        {t('builder.importMoreErrors', '…and {{count}} more lines could not be resolved.', {
                          count: importResult.errors.length - 10,
                        })}
                      </p>
                    )}
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
