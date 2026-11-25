import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.ts';
import { signInWithGooglePopup, signOutFirebase } from '../firebase.ts';
import type { User } from '../types.ts';

interface GoogleLoginOptions {
  role?: 'student' | 'teacher';
  preferredLanguage?: 'english' | 'french' | 'both';
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (options?: GoogleLoginOptions) => Promise<{ user: User; isNewUser: boolean }>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'teacher';
    preferredLanguage: 'english' | 'french' | 'both';
    bio?: string;
    expertise?: string;
  }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lingualearn_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('lingualearn_token');
    if (!storedToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<{ user: User }>('/auth/me');
      setUser(res.data.user);
    } catch {
      localStorage.removeItem('lingualearn_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem('lingualearn_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const loginWithGoogle = async (
    options?: GoogleLoginOptions
  ): Promise<{ user: User; isNewUser: boolean }> => {
    const googleAuth = await signInWithGooglePopup();
    const res = await api.post<{ token: string; user: User; isNewUser: boolean }>('/auth/google', {
      idToken: googleAuth.idToken,
      role: options?.role,
      preferredLanguage: options?.preferredLanguage,
    });
    localStorage.setItem('lingualearn_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return { user: res.data.user, isNewUser: Boolean(res.data.isNewUser) };
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'teacher';
    preferredLanguage: 'english' | 'french' | 'both';
    bio?: string;
    expertise?: string;
  }): Promise<User> => {
    const res = await api.post<{ token: string; user: User }>('/auth/register', payload);
    localStorage.setItem('lingualearn_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('lingualearn_token');
    setToken(null);
    setUser(null);
    void signOutFirebase();
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, loginWithGoogle, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
