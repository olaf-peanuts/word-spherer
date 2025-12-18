import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextProps {
  account?: any;
  login: () => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextProps>({
  login: async () => {},
  logout: () => {},
  getAccessToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<any>(null);

  const login = async () => {
    // Demo mode: set a fake account
    setAccount({ username: 'Demo User', localAccountId: 'demo' });
  };

  const logout = () => {
    setAccount(null);
  };

  const getAccessToken = async (): Promise<string | null> => {
    // Demo mode: return null (no auth required)
    return null;
  };

  useEffect(() => {
    // Auto-login in demo mode
    if (!account) {
      setAccount({ username: 'Demo User', localAccountId: 'demo' });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ account, login, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
