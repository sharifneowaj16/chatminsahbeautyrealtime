'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { AdminInventoryProvider } from '@/contexts/AdminInventoryContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import AdminLayoutWrapper from './AdminLayoutWrapper';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminRootLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  // Don't wrap login page with AdminLayoutWrapper or data providers
  if (isLoginPage) {
    return (
      <AdminAuthProvider>
        {children}
      </AdminAuthProvider>
    );
  }

  return (
    <AdminAuthProvider>
      <AdminInventoryProvider>
        <CategoriesProvider>
          <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
        </CategoriesProvider>
      </AdminInventoryProvider>
    </AdminAuthProvider>
  );
}
