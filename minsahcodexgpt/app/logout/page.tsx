'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F4F3EF] px-4 text-[#062402]">
      <Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]" />
      <p className="text-sm font-bold">Signing out securely...</p>
    </main>
  );
}
