import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTermBySlug, deleteTerm } from '../api/glossaryApi';
import { useAuth } from '../auth/AuthProvider';

const TermDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [term, setTerm] = useState<any>(null);
  const navigate = useNavigate();
  const { account } = useAuth();

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const data = await getTermBySlug(slug);
      setTerm(data);
    })();
  }, [slug]);

  if (!term) return <div>Loading…</div>;

  const isOwner = account && term.authorId === account?.oid;

  const handleDelete = async () => {
    if (!window.confirm('この用語を削除しますか？')) return;
    try {
      await deleteTerm(term.id);
      navigate('/');
    } catch (e) {
      alert('削除に失敗しました');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>{term.title}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isOwner && (
            <>
              <button
                onClick={() => navigate(`/edit/${term.id}`)}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                編集
              </button>
              <button
                onClick={handleDelete}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                削除
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/')}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            戻る
          </button>
        </div>
      </div>
      <div
        dangerouslySetInnerHTML={{ __html: term.htmlContent }}
        style={{ marginTop: '1rem' }}
      />
      {/* See / See Also */}
      <section>
        {term.seeLinks?.length > 0 && (
          <>
            <h3>See</h3>
            <ul>
              {term.seeLinks.map((link: any) => (
                <li key={link.target.id}>
                  <Link to={`/terms/${link.target.slug}`}>{link.target.title}</Link>
                </li>
              ))}
            </ul>
          </>
        )}
        {term.seenByLinks?.length > 0 && (
          <>
            <h3>See Also</h3>
            <ul>
              {term.seenByLinks.map((link: any) => (
                <li key={link.target.id}>
                  <Link to={`/terms/${link.target.slug}`}>{link.target.title}</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
};

export default TermDetail;
