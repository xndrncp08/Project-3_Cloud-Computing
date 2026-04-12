// src/hooks/useAuth.js
import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

// Decode JWT payload without verifying signature (verification happens server-side)
function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function getStoredUser() {
  const token = localStorage.getItem("diet_token");
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  // Check expiry
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    localStorage.removeItem("diet_token");
    return null;
  }
  return { token, name: payload.name, email: payload.email, userId: payload.userId };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());

  const login = useCallback((token) => {
    localStorage.setItem("diet_token", token);
    const payload = decodeToken(token);
    setUser({ token, name: payload.name, email: payload.email, userId: payload.userId });
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem("diet_token");
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore — we clear locally regardless
    }
    localStorage.removeItem("diet_token");
    setUser(null);
  }, []);

  // Authenticated fetch — automatically injects Bearer token
  const authFetch = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem("diet_token");
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
