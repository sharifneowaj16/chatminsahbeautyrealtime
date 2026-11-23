'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LogoutPage() {
  const { logout } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void logout().finally(() => {
      window.location.replace('/');
    });
  }, [logout]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF6F2] px-4 text-[#2D1F18]">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#984B29] border-t-transparent" />
      <p className="text-sm font-semibold">Signing out...</p>
    </main>
  );
}
