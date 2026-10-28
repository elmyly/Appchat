import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

export interface ForgotPasswordResult {
  success: boolean;
  message: string;
  resetLink?: string;
  emailSent?: boolean;
  email?: string;
  error?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  message: string;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password?: string) => Promise<boolean>;
  register: (data: {
    username: string;
    email: string;
    displayName?: string;
    password?: string;
    bio?: string;
    avatar?: string;
  }) => Promise<boolean>;
  requestRegistrationOtp: (data: {
    username: string;
    email: string;
    displayName?: string;
    password?: string;
    bio?: string;
    avatar?: string;
  }) => Promise<{ success: boolean; error?: string; devOtp?: string; emailSent?: boolean }>;
  verifyRegistrationOtp: (email: string, otp: string) => Promise<boolean>;
  resendRegistrationOtp: (email: string) => Promise<{ success: boolean; devOtp?: string; error?: string }>;
  forgotPassword: (emailOrUsername: string) => Promise<ForgotPasswordResult>;
  verifyResetToken: (token: string) => Promise<{ valid: boolean; email?: string; username?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<ResetPasswordResult>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aurachat_token') || localStorage.getItem('cipherchat_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load user on token load
  useEffect(() => {
    async function fetchMe() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token invalid
          localStorage.removeItem('aurachat_token');
          localStorage.removeItem('cipherchat_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to fetch auth session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMe();
  }, [token]);

  const login = async (identifier: string, password = 'password123'): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return false;
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('aurachat_token', data.token);
      return true;
    } catch (err: any) {
      setError(err.message || 'Network error');
      return false;
    }
  };

  const register = async (data: {
    username: string;
    email: string;
    displayName?: string;
    password?: string;
    bio?: string;
    avatar?: string;
  }): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          password: data.password || 'password123',
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setError(resData.error || 'Registration failed');
        return false;
      }

      setToken(resData.token);
      setUser(resData.user);
      localStorage.setItem('aurachat_token', resData.token);
      return true;
    } catch (err: any) {
      setError(err.message || 'Network error');
      return false;
    }
  };

  const requestRegistrationOtp = async (data: {
    username: string;
    email: string;
    displayName?: string;
    password?: string;
    bio?: string;
    avatar?: string;
  }): Promise<{ success: boolean; error?: string; devOtp?: string; emailSent?: boolean }> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          password: data.password || 'password123',
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setError(resData.error || 'Failed to send verification code');
        return { success: false, error: resData.error || 'Failed to send verification code' };
      }

      return {
        success: true,
        devOtp: resData.devOtp,
        emailSent: resData.emailSent,
      };
    } catch (err: any) {
      const msg = err.message || 'Network error';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const verifyRegistrationOtp = async (email: string, otp: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setError(resData.error || 'Verification failed');
        return false;
      }

      setToken(resData.token);
      setUser(resData.user);
      localStorage.setItem('aurachat_token', resData.token);
      return true;
    } catch (err: any) {
      setError(err.message || 'Network error');
      return false;
    }
  };

  const resendRegistrationOtp = async (email: string): Promise<{ success: boolean; devOtp?: string; error?: string }> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/resend-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to resend code' };
      }

      return { success: true, devOtp: resData.devOtp };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const forgotPassword = async (emailOrUsername: string): Promise<ForgotPasswordResult> => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          message: data.error || 'Failed to initiate password reset',
          error: data.error,
        };
      }
      return {
        success: true,
        message: data.message,
        resetLink: data.resetLink,
        emailSent: data.emailSent,
        email: data.email,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network connection failed',
        error: err.message,
      };
    }
  };

  const verifyResetToken = async (resetToken: string): Promise<{ valid: boolean; email?: string; username?: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/verify-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { valid: false, error: data.error || 'Invalid or expired reset link' };
      }
      return { valid: true, email: data.email, username: data.username };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Network error' };
    }
  };

  const resetPassword = async (resetToken: string, newPassword: string): Promise<ResetPasswordResult> => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Failed to reset password', error: data.error };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error', error: err.message };
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const resData = await res.json();
        setUser(resData.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('aurachat_token');
    localStorage.removeItem('cipherchat_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        requestRegistrationOtp,
        verifyRegistrationOtp,
        resendRegistrationOtp,
        forgotPassword,
        verifyResetToken,
        resetPassword,
        updateProfile,
        logout,
        error,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
