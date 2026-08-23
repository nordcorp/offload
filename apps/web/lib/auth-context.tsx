'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, LoginInput, RegisterInput } from '@offload/shared';
import { apiClient, refreshSession, setAccessToken } from './api-client';

interface AuthResponse {
  accessToken: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'offload_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function checkAuth() {
      try {
        const session = await refreshSession();
        if (!isActive) return;

        setUser(session?.user ?? null);
        if (session) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
        }
      } catch {
        if (!isActive) return;
        setUser(null);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void checkAuth();

    return () => {
      isActive = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const data = await apiClient<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    setAccessToken(data.accessToken);
    setUser(data.user);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const data = await apiClient<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    setAccessToken(data.accessToken);
    setUser(data.user);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore network/server errors during logout cleanup
    } finally {
      setAccessToken(null);
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
