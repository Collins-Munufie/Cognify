import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (tokenToUse) => {
    const activeToken = tokenToUse || token;
    if (!activeToken) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${activeToken}`;
      const response = await axios.get('http://127.0.0.1:8000/api/auth/me');
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user", error);
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (!user) {
        fetchUser(token).catch(err => {
          console.error("Initial user fetch failed:", err);
        });
      } else {
        setLoading(false);
      }
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 expects username
    formData.append('password', password);
    
    const response = await axios.post('http://127.0.0.1:8000/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const accessToken = response.data.access_token;
    localStorage.setItem('token', accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    await fetchUser(accessToken);
    setToken(accessToken);
  };

  const register = async (email, password) => {
    const response = await axios.post('http://127.0.0.1:8000/api/auth/register', { email, password });
    
    const accessToken = response.data.access_token;
    localStorage.setItem('token', accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    await fetchUser(accessToken);
    setToken(accessToken);
  };

  const logout = () => {
    setToken(null);
  };

  const value = { user, token, loading, login, register, logout, fetchUser };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

