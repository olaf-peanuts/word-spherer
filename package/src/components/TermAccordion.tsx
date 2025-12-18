import React, { useEffect, useState } from 'react';
import { getGroupedTerms } from '../api/glossaryApi';
import { Link } from 'react-router-dom';

interface Grouped {
  [key: string]: any[];
}

const TermAccordion: React.FC = () => {
  const [groups, setGroups] = useState<Grouped>({});

  useEffect(() => {
    (async () => {
      const data = await getGroupedTerms();
      setGroups(data);
    })();
  }, []);

  return (
    <div>
      {Object.entries(groups).map(([groupKey, terms]) => (
        <details key={groupKey}>
          <summary>{groupKey}</summary>
          <ul style={{ listStyle: 'none', paddingLeft: '1rem' }}>
            {terms.map(term => (
              <li key={term.id}>
                <Link to={`/terms/${term.slug}`}>{term.title}</Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
};

export default TermAccordion;
