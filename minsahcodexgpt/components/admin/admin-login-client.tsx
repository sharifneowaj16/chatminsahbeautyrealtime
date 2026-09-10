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
      <div className="admin-workspace min-h-screen flex items-center justify-center bg-gradient-to-br from-admin-panel to-admin-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-admin-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#8A8F98]">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn || user) {
    return (
      <div className="admin-workspace min-h-screen flex items-center justify-center bg-gradient-to-br from-admin-panel to-admin-bg">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-800/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#F7F8F8] mb-2">Login Successful!</h2>
          <p className="text-[#8A8F98] mb-4">Redirecting to admin dashboard...</p>
          <div className="w-64 bg-[rgba(255,255,255,0.08)] rounded-full h-2 mx-auto">
            <div className="bg-white text-black hover:bg-white/90 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="admin-workspace min-h-screen flex items-center justify-center bg-[#08090A] p-4 relative overflow-hidden"
      style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Subtle radial ambient glow behind the card, signature of Linear */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[400px] relative z-10">
        <div className="linear-card bg-[#0D0E11] border border-white/[0.08] rounded-2xl p-7 sm:p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_24px_48px_rgba(0,0,0,0.8)]">
          {/* Brand Mark */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.12] flex items-center justify-center mb-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.20)]">
              <span className="text-white font-semibold text-sm tracking-widest font-mono">MB</span>
            </div>
            <h1 className="text-lg font-semibold text-[#F7F8F8] tracking-tight">Admin Sign In</h1>
            <p className="text-xs text-[#8A8F98] mt-1">Authenticate to access the workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#8A8F98] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#62666D] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@minsahbeauty.com"
                  required
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2 border border-white/[0.08] bg-[#08090A] text-xs text-[#F7F8F8] placeholder-[#62666D] rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8A8F98] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#62666D] pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-9 pr-9 py-2 border border-white/[0.08] bg-[#08090A] text-xs text-[#F7F8F8] placeholder-[#62666D] rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#62666D] hover:text-[#8A8F98] transition-colors"
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
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-3 py-2 rounded-lg text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="h-9 w-full bg-white text-black font-semibold text-xs rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              <span className="text-black font-semibold">{isLoading ? 'Signing in...' : 'Continue'}</span>
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link href="/" className="text-[11px] text-[#8A8F98] hover:text-white transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Back to storefront
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
