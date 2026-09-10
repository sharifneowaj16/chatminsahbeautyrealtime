'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AdminLoginClientProps {
  redirectTo: string;
}

export function AdminLoginClient({ redirectTo }: AdminLoginClientProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { login, user, isLoading: authLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      setIsLoggedIn(true);
      setTimeout(() => {
        router.push(redirectTo);
      }, 500);
    }
  }, [user, authLoading, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        setIsLoggedIn(true);
        setTimeout(() => {
          router.push(redirectTo);
        }, 500);
      } else {
        setError(result.error || 'Invalid email or password');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="admin-workspace min-h-screen flex items-center justify-center bg-[#0b0d14]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs text-[#8a8f98]">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn || user) {
    return (
      <div className="admin-workspace min-h-screen flex items-center justify-center bg-[#0b0d14]">
        <div className="text-center">
          <div className="w-14 h-14 bg-[#10b981]/15 border border-[#10b981]/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#f7f8f8] mb-1.5">Login Successful!</h2>
          <p className="text-xs text-[#8a8f98] mb-4">Redirecting to admin dashboard...</p>
          <div className="w-48 bg-[#232636] rounded-full h-1.5 mx-auto overflow-hidden">
            <div className="bg-[#5e6ad2] h-full rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="admin-workspace min-h-screen flex items-center justify-center bg-[#0b0d14] p-4 relative overflow-hidden"
      style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Magic Blue ambient glow behind the card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[#5e6ad2]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[380px] relative z-10">
        <div className="bg-[#161824] border border-[#232636] rounded-xl p-6 sm:p-7 shadow-[0_24px_48px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.03)]">
          {/* Brand Mark */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#10121b] border border-[#232636] flex items-center justify-center mb-3 text-[#5e6ad2]">
              <span className="font-bold text-sm tracking-widest font-mono">MB</span>
            </div>
            <h1 className="text-base sm:text-lg font-semibold text-[#f7f8f8] tracking-tight">Admin Sign In</h1>
            <p className="text-xs text-[#8a8f98] mt-1">Authenticate to access the workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#8a8f98] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#62666d] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@minsahbeauty.com"
                  required
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2 border border-[#232636] bg-[#10121b] text-xs text-[#f7f8f8] placeholder-[#62666d] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5e6ad2] focus:border-[#5e6ad2] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8a8f98] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#62666d] pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-9 pr-9 py-2 border border-[#232636] bg-[#10121b] text-xs text-[#f7f8f8] placeholder-[#62666d] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5e6ad2] focus:border-[#5e6ad2] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#62666d] hover:text-[#8a8f98] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171] px-3 py-2 rounded-md text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="h-9 w-full bg-[#5e6ad2] text-white font-medium text-xs rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-[#6d78d5] active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Continue'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link href="/" className="text-[11px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Back to storefront
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
