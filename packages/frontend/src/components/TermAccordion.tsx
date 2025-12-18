import React, { useEffect, useState } from 'react';
import { getGroupedTerms, deleteTerm } from '../api/glossaryApi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

interface Grouped {
  [key: string]: any[];
}

const TermAccordion: React.FC = () => {
  const [groups, setGroups] = useState<Grouped>({});
  const { account } = useAuth();
  const navigate = useNavigate();

  const loadTerms = async () => {
    const data = await getGroupedTerms();
    setGroups(data);
  };

  useEffect(() => {
    loadTerms();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`「${title}」を削除しますか？`)) return;
    try {
      await deleteTerm(id);
      loadTerms();
    } catch (e) {
      alert('削除に失敗しました');
    }
  };

  return (
    <div>
      {Object.entries(groups).map(([groupKey, terms]) => (
        <details key={groupKey}>
          <summary>{groupKey}</summary>
          <ul style={{ listStyle: 'none', paddingLeft: '1rem' }}>
            {terms.map(term => (
              <li key={term.id} style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to={`/terms/${term.slug}`}>{term.title}</Link>
                {account && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => navigate(`/edit/${term.id}`)}
                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(term.id, term.title)}
                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      削除
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
};

export default TermAccordion;
