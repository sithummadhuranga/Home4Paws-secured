"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  authProvider: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<{ success: boolean; message: string }>;
  signup: (userData: SignupData) => Promise<{ success: boolean; message: string }>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

interface AuthResponse {
  success: boolean;
  message: string;
  errors?: string[];
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    emailVerified: boolean;
    createdAt: string;
    lastLoginAt?: string;
    authProvider: string;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUser(raw: NonNullable<AuthResponse['user']>): User {
  return {
    id: raw.id.toString(),
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    role: raw.role,
    emailVerified: raw.emailVerified,
    createdAt: raw.createdAt,
    lastLoginAt: raw.lastLoginAt,
    authProvider: raw.authProvider,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // The access token lives in an httpOnly cookie now, so the only way to know
  // whether a session is live is to ask the backend - there's nothing left client-side to check
  const checkAuth = useCallback(async () => {
    try {
      let response = await fetch(`${API_BASE_URL}/auth/verify`, {
        credentials: 'include',
      });

      // A 401 here just means the 15-minute access token expired, not that the
      // session is over - the refresh cookie can still be good for a day (or
      // 30, with remember-me), so try that silently before logging the user out
      if (response.status === 401) {
        const refreshed = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshed.ok) {
          response = await fetch(`${API_BASE_URL}/auth/verify`, {
            credentials: 'include',
          });
        }
      }

      if (!response.ok) {
        setUser(null);
        return;
      }

      const data: AuthResponse = await response.json();
      setUser(data.success && data.user ? toUser(data.user) : null);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false));
  }, [checkAuth]);

  // Renew the access token in the background before it expires, so an active
  // session doesn't hit a random 401 mid-use just because 15 minutes passed
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.warn('Background token refresh failed:', error);
      }
    }, 12 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.message || 'Login failed');
      }

      const userData = toUser(data.user);
      setUser(userData);

      if (userData.role === 'Admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logoutFromAllDevices: false }),
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      setUser(null);
      toast.success('Logged out successfully');
      router.push('/');
    }
  }, [router]);

  const register = useCallback(async (userData: RegisterData): Promise<{ success: boolean; message: string }> => {
    return signup({
      ...userData,
      confirmPassword: userData.password,
      agreeToTerms: true
    });
  }, []);

  const signup = useCallback(async (userData: SignupData): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok || !data.success || !data.user) {
        return {
          success: false,
          message: data.message || 'Signup failed'
        };
      }

      const newUser = toUser(data.user);
      setUser(newUser);

      if (newUser.role === 'Admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }

      return {
        success: true,
        message: 'Account created successfully!'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Signup failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        register,
        signup,
        refreshUser: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
