'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { User, LoginInput, RegisterInput } from '@offload/shared';
import {
  apiClient,
  refreshSession,
  setAccessToken,
  subscribeSession,
} from './api-client';
import { startSessionMonitor } from './session-monitor';

interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  authError: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'offload_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isMounted = useRef(false);

  const syncUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    if (typeof window === 'undefined') return;

    if (nextUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  const retryAuth = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const session = await refreshSession();
      if (!isMounted.current) return;

      syncUser(session?.user ?? null);
    } catch {
      if (!isMounted.current) return;
      setAuthError('Unable to verify your session. Check your connection and try again.');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [syncUser]);

  useEffect(() => {
    isMounted.current = true;
    const unsubscribe = subscribeSession(event => {
      if (event.type === 'updated') {
        setAuthError(null);
        syncUser(event.session.user);
      } else {
        setAuthError(null);
        syncUser(null);
      }
    });

    void retryAuth();

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, [retryAuth, syncUser]);

  useEffect(() => {
    if (!user) return;

    return startSessionMonitor(async () => {
      try {
        await apiClient<void>('/api/auth/session');
      } catch {
        // Confirmed session loss is delivered by the API client event.
        // Temporary network/server errors leave the current session intact.
      }
    });
  }, [user]);

  const login = useCallback(async (input: LoginInput) => {
    const data = await apiClient<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    setAccessToken(data.accessToken);
    setAuthError(null);
    syncUser(data.user);
  }, [syncUser]);

  const register = useCallback(async (input: RegisterInput) => {
    const data = await apiClient<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    setAccessToken(data.accessToken);
    setAuthError(null);
    syncUser(data.user);
  }, [syncUser]);

  const logout = useCallback(async () => {
    try {
      await apiClient('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore network/server errors during logout cleanup
    } finally {
      setAccessToken(null);
      setAuthError(null);
      syncUser(null);
    }
  }, [syncUser]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      authError,
      login,
      register,
      logout,
      retryAuth,
    }}>
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
