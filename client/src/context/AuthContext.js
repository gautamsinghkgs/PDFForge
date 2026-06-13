import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { clearGuestUsage } from '../utils/guestLimit';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on mount ──
  useEffect(() => {
    const stored = sessionStorage.getItem('pdfforge_user');
    const token  = sessionStorage.getItem('pdfforge_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
      // Verify token is still valid
      api.get('/auth/me')
        .then(({ data }) => setUser(data.user))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('pdfforge_token', data.token);
    sessionStorage.setItem('pdfforge_user', JSON.stringify(data.user));
    setUser(data.user);
    clearGuestUsage();
    return data;
  }, []);

  const googleLogin = useCallback(async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    sessionStorage.setItem('pdfforge_token', data.token);
    sessionStorage.setItem('pdfforge_user', JSON.stringify(data.user));
    setUser(data.user);
    clearGuestUsage();
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    sessionStorage.setItem('pdfforge_token', data.token);
    sessionStorage.setItem('pdfforge_user', JSON.stringify(data.user));
    setUser(data.user);
    clearGuestUsage();
    return data;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('pdfforge_token');
    sessionStorage.removeItem('pdfforge_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser(updated);
    sessionStorage.setItem('pdfforge_user', JSON.stringify(updated));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
