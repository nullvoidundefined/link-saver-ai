'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import type { ReactNode } from 'react';

import { api } from '@/lib/api';

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
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<{ user: User }>('/auth/me')
            .then((res) => setUser(res.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const res = await api.post<{ user: User }>('/auth/login', {
            email,
            password,
        });
        setUser(res.user);
    }, []);

    const register = useCallback(async (email: string, password: string) => {
        const res = await api.post<{ user: User }>('/auth/register', {
            email,
            password,
        });
        setUser(res.user);
    }, []);

    const logout = useCallback(async () => {
        await api.post('/auth/logout', {});
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, loading, login, register, logout }}
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
