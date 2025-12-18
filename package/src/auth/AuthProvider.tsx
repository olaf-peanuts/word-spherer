import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  PublicClientApplication,
  InteractionType,
  AuthenticationResult,
} from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_AD_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

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
    try {
      const result = await msalInstance.loginPopup({
        scopes: ['api://YOUR_API_APP_ID/.default'],
        prompt: 'select_account',
      });
      setAccount(result.account);
    } catch (e) {
      console.error(e);
    }
  };

  const logout = () => {
    if (account) {
      msalInstance.logoutPopup({ account });
      setAccount(undefined);
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!account) return null;
    try {
      const response: AuthenticationResult = await msalInstance.acquireTokenSilent({
        scopes: ['api://YOUR_API_APP_ID/.default'],
        account,
      });
      return response.accessToken;
    } catch (e) {
      // fallback to interactive
      const response = await msalInstance.acquireTokenPopup({
        scopes: ['api://YOUR_API_APP_ID/.default'],
      });
      return response.accessToken;
    }
  };

  useEffect(() => {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) setAccount(accounts[0]);
  }, []);

  return (
    <AuthContext.Provider value={{ account, login, logout, getAccessToken }}>
      <MsalProvider instance={msalInstance}>{children}</MsalProvider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
