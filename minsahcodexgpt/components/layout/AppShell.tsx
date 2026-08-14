'use client';

import { usePathname } from 'next/navigation';
import CartDrawer from '@/components/cart/CartDrawer';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import SocialFloatingButtons from '@/app/components/SocialFloatingButtons';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';
import { getShellPolicy } from './shell-policy';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const policy = getShellPolicy(pathname);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-minsah-dark focus:shadow-lg"
      >
        Skip to content
      </a>

      {policy.showSiteHeader ? <SiteHeader /> : null}

      <main id="main-content" tabIndex={-1} className="min-w-0">
        {children}
      </main>

      {policy.showSiteFooter ? <SiteFooter /> : null}

      {policy.showBottomNavigation ? (
        <>
          <div className="minsah-shell-bottom-spacer md:hidden" aria-hidden="true" />
          <BottomNavigation />
        </>
      ) : null}

      {policy.showCartDrawer ? <CartDrawer /> : null}
      {policy.showFloatingActions ? <SocialFloatingButtons /> : null}
    </>
  );
}
