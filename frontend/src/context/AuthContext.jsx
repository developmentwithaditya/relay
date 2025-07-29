// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [authReady, setAuthReady] = useState(false);

  const fetchUserData = useCallback(async (authToken) => {
    try {
      const response = await fetch('http://localhost:3001/api/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch user data');
      const userData = await response.json();
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
    // --- FIX: Standardize the user object to always use _id ---
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
