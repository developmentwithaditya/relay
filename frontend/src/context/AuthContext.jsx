// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';

// Create the context
export const AuthContext = createContext(null);

// Create the provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token')); // Get token from browser storage

  useEffect(() => {
    if (token) {
      // If we have a token, we should verify it with the backend to get user data
      // For now, we'll decode it. In a real app, you'd make an API call.
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser({ id: payload.userId, role: payload.role });
        } else {
          // Token expired
          localStorage.removeItem('token');
          setToken(null);
        }
      } catch (e) {
        console.error("Invalid token:", e);
        localStorage.removeItem('token');
        setToken(null);
      }
    }
  }, [token]);

  const login = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    setToken(userToken);
    setUser({ id: userData.id, role: userData.role, email: userData.email });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // The value provided to consuming components
  const value = {
    user,
    token,
    isLoggedIn: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
