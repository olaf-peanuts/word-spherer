import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTermBySlug, updateTerm, createTerm } from '../api/glossaryApi';
import MarkdownEditor from '../components/MarkdownEditor';

const EditTerm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initialContent, setInitialContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load term data if editing
  useEffect(() => {
    if (!id || id === 'new') return;
    (async () => {
      try {
        setLoading(true);
        const term = await getTermBySlug(id);
        setTitle(term.title);
        setInitialContent(term.markdownContent);
      } catch (e: any) {
        setError('用語の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (markdown: string) => {
    if (!title.trim()) {
      alert('タイトルを入力してください');
      return;
    }
    try {
      const payload = { title, markdownContent: markdown };
      if (id && id !== 'new') {
        await updateTerm(id, payload);
      } else {
        await createTerm(payload);
      }
      navigate('/');
    } catch (e: any) {
      alert('保存に失敗しました: ' + e.message);
    }
  };

  if (loading) return <div style={{ padding: '1rem' }}>読み込み中…</div>;
  if (error) return <div style={{ padding: '1rem', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>{id && id !== 'new' ? '用語編集' : '新規作成'}</h2>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          戻る
        </button>
      </div>
      <input
        type="text"
        placeholder="タイトル"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ width: '100%', marginBottom: '0.5rem', padding: '0.4rem', boxSizing: 'border-box' }}
      />
      <MarkdownEditor initialContent={initialContent} onSubmit={handleSubmit} />
    </div>
  );
};

export default EditTerm;
