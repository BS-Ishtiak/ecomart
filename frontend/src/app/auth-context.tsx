"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";


interface AuthContextType {
  loggedIn: boolean;
  setLoggedIn: (val: boolean) => void;
  logout: () => void;
  loading: boolean;
  setLoading: (val: boolean) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  refreshToken: string | null;
  setRefreshToken: (token: string | null) => void;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("accessToken");
    }
    return false;
  });
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessTokenState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return null;
  });
  const [refreshToken, setRefreshTokenState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refreshToken");
    }
    return null;
  });

  const setAccessToken = (token: string | null) => {
    setAccessTokenState(token);
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("accessToken", token);
      else localStorage.removeItem("accessToken");
    }
  };
  const setRefreshToken = (token: string | null) => {
    setRefreshTokenState(token);
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("refreshToken", token);
      else localStorage.removeItem("refreshToken");
    }
  };

  const logout = async () => {
    setLoggedIn(false);
    setAccessToken(null);
    setRefreshToken(null);
    // Optionally, call backend to invalidate refresh token
    try {
      const token = localStorage.getItem("refreshToken");
      if (token) {
        await fetch("http://localhost:5000/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      }
    } catch {}
  };

  return (
    <AuthContext.Provider value={{
      loggedIn,
      setLoggedIn,
      logout,
      loading,
      setLoading,
      accessToken,
      setAccessToken,
      refreshToken,
      setRefreshToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
