import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTermBySlug } from '../api/glossaryApi';
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

  return (
    <div style={{ padding: '1rem' }}>
      <h2>{term.title}</h2>
      {isOwner && (
        <button onClick={() => navigate(`/edit/${term.id}`)}>編集</button>
      )}
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
