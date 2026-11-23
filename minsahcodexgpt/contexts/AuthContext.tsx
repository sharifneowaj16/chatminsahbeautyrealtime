'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import { trackCompleteRegistrationEvent } from '@/lib/tracking/events';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  avatar: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified?: boolean;
  loyaltyPoints: number;
  referralCode: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
  preferences?: {
    newsletter: boolean;
    smsNotifications: boolean;
    promotions: boolean;
    newProducts: boolean;
    orderUpdates: boolean;
  };
}

export interface RegisterData {
  email?: string;
  name: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  referralCode?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithOtp: (phone: string, otpProof: string) => Promise<{ success: boolean; error?: string }>;
  loginWithProvider: (provider: 'google' | 'facebook' | string, callbackUrl?: string) => void;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string; code?: string }>;
  updateUser: (userData: Partial<User>) => Promise<boolean>;
  updatePreferences: (preferences: Partial<NonNullable<User['preferences']>>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  uploadAvatar: (file: File) => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  isInRole: (role: string) => boolean;
  refreshUser: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rolePermissions: Record<string, string[]> = {
  customer: [
    'browse_products',
    'view_products',
    'add_to_cart',
    'purchase_products',
    'write_reviews',
    'manage_profile',
    'manage_addresses',
    'manage_wishlist',
    'view_orders',
    'track_orders',
  ],
  vip: [
    'browse_products',
    'view_products',
    'add_to_cart',
    'purchase_products',
    'write_reviews',
    'manage_profile',
    'manage_addresses',
    'manage_wishlist',
    'view_orders',
    'track_orders',
    'exclusive_deals',
    'early_access',
    'free_shipping',
    'priority_support',
  ],
  premium: [
    'browse_products',
    'view_products',
    'add_to_cart',
    'purchase_products',
    'write_reviews',
    'manage_profile',
    'manage_addresses',
    'manage_wishlist',
    'view_orders',
    'track_orders',
    'exclusive_deals',
    'early_access',
    'free_shipping',
    'priority_support',
    'personal_stylist',
    'birthday_rewards',
    'anniversary_rewards',
  ],
};

function AuthProviderContent({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const signingOutRef = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchUserProfile = useCallback(async (): Promise<boolean> => {
    if (signingOutRef.current) return false;
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user ?? null);
        return Boolean(data.user);
      }

      setUser(null);
      return false;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  const sessionUserId = session?.user?.id || '';
  const sessionRevoked = Boolean((session as { revoked?: boolean } | null)?.revoked);

  useEffect(() => {
    if (status === 'loading') return;

    let active = true;

    const syncAuth = async () => {
      if (status !== 'authenticated' || !sessionUserId || sessionRevoked) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      await fetchUserProfile();
      if (active) {
        setLoading(false);
      }
    };

    void syncAuth();

    return () => {
      active = false;
    };
  }, [status, sessionUserId, sessionRevoked, fetchUserProfile]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setLoading(true);
      setError(null);

      try {
        const result = await signIn('credentials', {
          email: identifier.trim(),
          password,
          redirect: false,
        });

        if (result?.ok && !result.error) {
          await updateSession().catch(() => {});
          await fetchUserProfile();
          return { success: true };
        }

        const errorMessage =
          result?.error === 'CredentialsSignin'
            ? 'Invalid email/phone or password.'
            : result?.error || 'Login failed. Please try again.';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } catch {
        const errorMessage = 'Network error. Please try again.';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [fetchUserProfile, updateSession]
  );

  const loginWithOtp = useCallback(
    async (phone: string, otpProof: string): Promise<{ success: boolean; error?: string }> => {
      setLoading(true);
      setError(null);

      try {
        const result = await signIn('phone-otp', {
          phone: phone.trim(),
          otpProof,
          redirect: false,
        });

        if (result?.ok && !result.error) {
          await updateSession().catch(() => {});
          await fetchUserProfile();
          return { success: true };
        }

        const errorMessage =
          result?.error === 'CredentialsSignin'
            ? 'Verification expired. Please request a new code.'
            : result?.error || 'Unable to verify your phone login.';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } catch {
        const errorMessage = 'Network error. Please try again.';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [fetchUserProfile, updateSession]
  );

  const loginWithProvider = useCallback((provider: string, callbackUrl?: string) => {
    const currentPath =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '/account';
    const safeTarget = sanitizeRedirectPath(callbackUrl || currentPath, '/account');
    void signIn(provider, { callbackUrl: safeTarget });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    signingOutRef.current = true;
    setLoading(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      }).catch((err) => {
        console.error('Logout API error:', err);
      });

      await signOut({ redirect: false }).catch((err) => {
        console.error('NextAuth signOut error:', err);
      });
    } finally {
      setUser(null);
      setLoading(false);
      signingOutRef.current = false;
    }
  }, []);

  const register = useCallback(
    async (userData: RegisterData): Promise<{ success: boolean; error?: string; code?: string }> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = Array.isArray(data.details)
            ? data.details[0] || data.error || 'Registration failed'
            : data.error || 'Registration failed';
          setError(errorMessage);
          return { success: false, error: errorMessage, code: data.code };
        }

        trackCompleteRegistrationEvent({
          method: userData.email ? 'email' : 'phone',
          status: 'success',
        });

        const loginIdentifier = (userData.email || userData.phone || '').trim();
        if (loginIdentifier && userData.password) {
          const signInResult = await signIn('credentials', {
            email: loginIdentifier,
            password: userData.password,
            redirect: false,
          });
          if (signInResult?.ok && !signInResult.error) {
            await updateSession().catch(() => {});
            await fetchUserProfile();
          }
        }

        return { success: true };
      } catch {
        const errorMessage = 'Network error. Please try again.';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [fetchUserProfile, updateSession]
  );

  const refreshToken = useCallback(async (): Promise<boolean> => {
    return false;
  }, []);

  const updateUser = async (userData: Partial<User>): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updatePreferences = async (
    preferences: Partial<NonNullable<User['preferences']>>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch('/api/auth/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser((prev) => (prev ? { ...prev, preferences: data.preferences } : null));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to change password' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const uploadAvatar = async (file: File): Promise<boolean> => {
    if (!user) return false;

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/auth/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUser((prev) => (prev ? { ...prev, avatar: data.avatarUrl } : null));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return rolePermissions[user.role]?.includes(permission) || false;
  };

  const isInRole = (role: string): boolean => {
    return user?.role === role;
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    loginWithOtp,
    loginWithProvider,
    logout,
    register,
    updateUser,
    updatePreferences,
    changePassword,
    uploadAvatar,
    hasPermission,
    isInRole,
    refreshUser: fetchUserProfile,
    refreshToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <AuthProviderContent>{children}</AuthProviderContent>
    </SessionProvider>
  );
}

const defaultAuthFallback: AuthContextType = {
  user: null,
  loading: false,
  error: null,
  login: async () => ({ success: false, error: 'AuthProvider not found' }),
  loginWithOtp: async () => ({ success: false, error: 'AuthProvider not found' }),
  loginWithProvider: () => {},
  logout: async () => {},
  register: async () => ({ success: false, error: 'AuthProvider not found' }),
  updateUser: async () => false,
  updatePreferences: async () => false,
  changePassword: async () => ({ success: false, error: 'AuthProvider not found' }),
  uploadAvatar: async () => false,
  hasPermission: () => false,
  isInRole: () => false,
  refreshUser: async () => false,
  refreshToken: async () => false,
  clearError: () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return defaultAuthFallback;
  }
  return context;
}

export function useIsAuthenticated() {
  const { user, loading } = useAuth();
  return { isAuthenticated: !!user, loading };
}

export function useUserPermissions() {
  const { hasPermission, isInRole } = useAuth();

  return {
    canBrowseProducts: hasPermission('browse_products'),
    canViewProducts: hasPermission('view_products'),
    canAddToCart: hasPermission('add_to_cart'),
    canPurchaseProducts: hasPermission('purchase_products'),
    canWriteReviews: hasPermission('write_reviews'),
    canManageProfile: hasPermission('manage_profile'),
    canManageAddresses: hasPermission('manage_addresses'),
    canManageWishlist: hasPermission('manage_wishlist'),
    canViewOrders: hasPermission('view_orders'),
    canTrackOrders: hasPermission('track_orders'),
    canAccessExclusiveDeals: hasPermission('exclusive_deals'),
    canGetEarlyAccess: hasPermission('early_access'),
    hasFreeShipping: hasPermission('free_shipping'),
    hasPrioritySupport: hasPermission('priority_support'),
    hasPersonalStylist: hasPermission('personal_stylist'),
    getsBirthdayRewards: hasPermission('birthday_rewards'),
    getsAnniversaryRewards: hasPermission('anniversary_rewards'),
    isVip: isInRole('vip'),
    isPremium: isInRole('premium'),
    isCustomer: isInRole('customer'),
  };
}

export function useLoyaltyPoints() {
  const { user } = useAuth();

  return {
    currentPoints: user?.loyaltyPoints || 0,
    addPoints: async () => false,
    redeemPoints: async () => false,
    canRedeem: (points: number) => !!(user && user.loyaltyPoints >= points),
  };
}
