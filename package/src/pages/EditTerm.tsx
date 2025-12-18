import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTermBySlug, updateTerm, createTerm } from '../api/glossaryApi';
import MarkdownEditor from '../components/MarkdownEditor';

const EditTerm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initialContent, setInitialContent] = useState('');
  const [title, setTitle] = useState('');

  // Load term data if editing
  useEffect(() => {
    if (!id) return;
    (async () => {
      const term = await getTermBySlug(id); // API also supports fetch by id if needed
      setTitle(term.title);
      setInitialContent(term.markdownContent);
    })();
  }, [id]);

  const handleSubmit = async (markdown: string) => {
    const payload = { title, markdownContent: markdown };
    if (id) {
      await updateTerm(id, payload);
    } else {
      await createTerm(payload);
    }
    navigate('/');
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>{id ? '用語編集' : '新規作成'}</h2>
      <input
        type="text"
        placeholder="タイトル"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ width: '100%', marginBottom: '0.5rem', padding: '0.4rem' }}
      />
      <MarkdownEditor initialContent={initialContent} onSubmit={handleSubmit} />
    </div>
  );
};

export default EditTerm;
