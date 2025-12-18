import React from 'react';
import SearchBar from '../components/SearchBar';
import TermAccordion from '../components/TermAccordion';
import { useAuth } from '../auth/AuthProvider';

const HomePage: React.FC = () => {
  const { account, login, logout } = useAuth();

  return (
    <div style={{ padding: '1rem' }}>
      <header style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <h1>用語集</h1>
        {account ? (
          <button onClick={logout}>ログアウト ({account.username})</button>
        ) : (
          <button onClick={login}>Azure AD でログイン</button>
        )}
      </header>

      <SearchBar />
      <hr />
      <TermAccordion />
    </div>
  );
};

export default HomePage;
