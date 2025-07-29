// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
// Import our centralized apiRequest helper
import apiRequest from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [authReady, setAuthReady] = useState(false);

  const fetchUserData = useCallback(async (authToken) => {
    try {
      // --- DEFINITIVE FIX: Use the apiRequest helper ---
      const userData = await apiRequest('/api/me', { token: authToken });
      setUser(userData);
    } catch (e) {
      console.error("Auth fetch error:", e);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserData(token);
    } else {
      setAuthReady(true);
    }
  }, [token, fetchUserData]);

  const login = (loginData, userToken) => {
    localStorage.setItem('token', userToken);
    const standardizedUser = { ...loginData, _id: loginData.id };
    setUser(standardizedUser);
    setToken(userToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isLoggedIn: !!user,
    authReady,
    login,
    logout,
    refreshUserData: () => {
      if(token) fetchUserData(token);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
