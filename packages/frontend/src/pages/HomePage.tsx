import React from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import TermAccordion from '../components/TermAccordion';
import { useAuth } from '../auth/AuthProvider';

const HomePage: React.FC = () => {
  const { account, login, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1rem' }}>
      <header style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>用語集</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {account && (
            <button onClick={() => navigate('/edit/new')} style={{ backgroundColor: '#28a745', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              + 新規登録
            </button>
          )}
          {account ? (
            <button onClick={logout} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
              ログアウト ({account.username})
            </button>
          ) : (
            <button onClick={login} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
              Azure AD でログイン
            </button>
          )}
        </div>
      </header>

      <SearchBar />
      <hr />
      <TermAccordion />
    </div>
  );
};

export default HomePage;
