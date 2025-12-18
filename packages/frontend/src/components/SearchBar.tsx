import React, { useState, useEffect } from 'react';
import { searchTerms } from '../api/glossaryApi';
import { Link } from 'react-router-dom';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // Debounce
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.trim().length === 0) {
        setResults([]);
        return;
      }
      const data = await searchTerms(query);
      setResults(data);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  return (
    <div>
      <input
        type="text"
        placeholder="検索…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: '100%', padding: '0.5rem' }}
      />
      {results.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {results.map(r => (
            <li key={r.id}>
              <Link to={`/terms/${r.slug}`}>{r.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
