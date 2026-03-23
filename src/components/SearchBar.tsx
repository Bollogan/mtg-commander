import { useEffect, useState } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  onSearch: (term: string) => void;
}

export const SearchBar = ({ onSearch }: SearchBarProps) => {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const debounced = useDebounce(term, 400);

  useEffect(() => {
    onSearch(debounced);
  }, [debounced, onSearch]);

  return (
    <Form className="search-form">
      <InputGroup>
        <InputGroup.Text aria-hidden>🔍</InputGroup.Text>
        <Form.Control
          type="text"
          placeholder={t('search.placeholder')}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </InputGroup>
    </Form>
  );
};

const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
};