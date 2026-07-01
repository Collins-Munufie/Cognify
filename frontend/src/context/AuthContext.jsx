import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (tokenToUse) => {
    const activeToken = tokenToUse || token;
    if (!activeToken) {
      setLoading(false);
      setUser(null);
      return;
    }
    
    try {
      const response = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user", error);
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      if (!token) {
        localStorage.removeItem('token');
        setUser(null);
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      setLoading(true);
      try {
        await fetchUser(token);
      } catch (err) {
        if (!cancelled) {
          console.error("Initial user fetch failed:", err);
        }
      }
    };

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [token, fetchUser]);

  const login = useCallback(async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const accessToken = response.data.access_token;
    localStorage.setItem('token', accessToken);
    const nextUser = await fetchUser(accessToken);
    setToken(accessToken);
    return nextUser;
  }, [fetchUser]);

  const register = useCallback(async (email, password) => {
    const response = await api.post('/api/auth/register', { email, password });
    
    const accessToken = response.data.access_token;
    localStorage.setItem('token', accessToken);
    const nextUser = await fetchUser(accessToken);
    setToken(accessToken);
    return nextUser;
  }, [fetchUser]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, fetchUser }),
    [user, token, loading, login, register, logout, fetchUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

