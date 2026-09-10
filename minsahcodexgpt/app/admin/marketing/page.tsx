import { Suspense } from 'react';
import { AdminMarketingClient } from '@/components/admin/admin-marketing-client';

type MarketingTab = 'overview' | 'social' | 'whatsapp' | 'email' | 'sms' | 'google' | 'meta';

interface MarketingPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function MarketingPage({ searchParams }: MarketingPageProps) {
  const params = await searchParams;
  const tab = params.tab as MarketingTab;
  const initialTab: MarketingTab = tab && ['overview', 'social', 'whatsapp', 'email', 'sms', 'google', 'meta'].includes(tab)
    ? tab
    : 'overview';

  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center bg-transparent">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-[#8a8f98]">Loading marketing dashboard...</p>
        </div>
      </div>
    }>
      <AdminMarketingClient initialTab={initialTab} />
    </Suspense>
  );
}
