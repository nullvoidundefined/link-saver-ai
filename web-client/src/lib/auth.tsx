'use client';

import { createContext, useCallback, useContext } from 'react';
import type { ReactNode } from 'react';

import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await api.get<{ user: User }>('/auth/me');
        return res.user;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ user: User }>('/auth/login', {
        email,
        password,
      });
      queryClient.setQueryData(['auth', 'me'], res.user);
    },
    [queryClient],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ user: User }>('/auth/register', {
        email,
        password,
      });
      queryClient.setQueryData(['auth', 'me'], res.user);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout', {});
    queryClient.setQueryData(['auth', 'me'], null);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user: data ?? null,
        loading: isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
