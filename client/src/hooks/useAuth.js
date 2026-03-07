'use client';
import { useState } from 'react';

export function useAuth() {
  // State to track authentication status
  const [authenticated, setAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!sessionStorage.getItem('auth');
    }
    return false;
  });

  // Check if authenticated (reactive)
  const isAuthenticated = () => authenticated;

  // Login function
  const login = (email, password) => {
    if (typeof window === 'undefined') return false;

    const stored = JSON.parse(localStorage.getItem('user'));
    if (stored && stored.email === email && stored.password === password) {
      sessionStorage.setItem('auth', 'true');
      setAuthenticated(true); // update state
      return true;
    }
    return false;
  };

  // Logout function
  const logout = () => {
    if (typeof window === 'undefined') return;

    sessionStorage.removeItem('auth');
    setAuthenticated(false); // update state
  };

  // Get stored user
  const getUser = () => {
    if (typeof window === 'undefined') return null;
    return JSON.parse(localStorage.getItem('user')) || null;
  };

  // Save user to localStorage
  const saveUser = (userData) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return { isAuthenticated, login, logout, getUser, saveUser };
}
