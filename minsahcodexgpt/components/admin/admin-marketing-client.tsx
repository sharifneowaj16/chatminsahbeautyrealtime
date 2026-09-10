'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MarketingHub from '@/app/components/admin/MarketingHub';
import WhatsAppIntegration from '@/app/components/admin/WhatsAppIntegration';
import GoogleServicesIntegration from '@/app/components/admin/GoogleServicesIntegration';
import {
  Megaphone,
  Smartphone,
  Globe,
  Mail,
  Bell,
  BarChart,
  Facebook,
  Save,
  Target,
  Users,
  CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type MarketingTab = 'overview' | 'social' | 'whatsapp' | 'email' | 'sms' | 'google' | 'meta';

interface MarketingTabItem {
  id: MarketingTab;
  name: string;
  icon: LucideIcon;
  badge?: string;
}

interface AdminMarketingClientProps {
  initialTab: MarketingTab;
}

export function AdminMarketingClient({ initialTab }: AdminMarketingClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MarketingTab>(initialTab);

  const handleTabChange = (tab: MarketingTab) => {
    setActiveTab(tab);
    router.push(`/admin/marketing?tab=${tab}`, { scroll: false });
  };

  const tabs: MarketingTabItem[] = [
    { id: 'overview' as MarketingTab, name: 'Overview', icon: BarChart },
    { id: 'social' as MarketingTab, name: 'Social Media', icon: Globe },
    { id: 'meta' as MarketingTab, name: 'Meta Pixel & Ads', icon: Facebook },
    { id: 'whatsapp' as MarketingTab, name: 'WhatsApp', icon: Smartphone },
    { id: 'email' as MarketingTab, name: 'Email Marketing', icon: Mail },
    { id: 'sms' as MarketingTab, name: 'SMS Marketing', icon: Bell },
    { id: 'google' as MarketingTab, name: 'Google Services', icon: Megaphone },
  ];

  const [metaSetup, setMetaSetup] = useState({
    pixelId: '',
    conversionApiToken: '',
    objective: 'sales',
    dailyBudgetBdt: 3000,
    selectedAudiences: ['cart_7d', 'view_14d'],
  });
  const [metaSaved, setMetaSaved] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [audiencePresets, setAudiencePresets] = useState([
    { id: 'cart_7d', label: 'Cart Abandoners (7D)', size: 3200 },
    { id: 'view_14d', label: 'Product Viewers (14D)', size: 7600 },
    { id: 'checkout_7d', label: 'Checkout Starters (7D)', size: 2100 },
    { id: 'engaged_30d', label: 'High Intent Visitors (30D)', size: 9800 },
  ]);
  const selectedReach = audiencePresets
    .filter((item) => metaSetup.selectedAudiences.includes(item.id))
    .reduce((sum, item) => sum + item.size, 0);

  useEffect(() => {
    if (activeTab !== 'meta') return;

    let cancelled = false;
    const loadMetaData = async () => {
      setMetaLoading(true);
      setMetaError(null);
      try {
        const [settingsRes, audiencesRes] = await Promise.all([
          fetch('/api/admin/meta/settings', { credentials: 'include' }),
          fetch('/api/admin/meta/audiences', { credentials: 'include' }),
        ]);

        if (!settingsRes.ok || !audiencesRes.ok) {
          throw new Error('Failed to load meta setup');
        }

        const settingsData = (await settingsRes.json()) as { settings?: typeof metaSetup };
        const audiencesData = (await audiencesRes.json()) as { audiences?: typeof audiencePresets };

        if (!cancelled && settingsData.settings) {
          setMetaSetup({
            pixelId: settingsData.settings.pixelId || '',
            conversionApiToken: settingsData.settings.conversionApiToken || '',
            objective: settingsData.settings.objective || 'sales',
            dailyBudgetBdt: Number(settingsData.settings.dailyBudgetBdt ?? 3000),
            selectedAudiences: Array.isArray(settingsData.settings.selectedAudiences)
              ? settingsData.settings.selectedAudiences
              : ['cart_7d', 'view_14d'],
          });
        }
        if (!cancelled && Array.isArray(audiencesData.audiences) && audiencesData.audiences.length > 0) {
          setAudiencePresets(audiencesData.audiences.map((item) => ({
            id: item.id,
            label: item.label,
            size: Number(item.size ?? 0),
          })));
        }
      } catch (error) {
        if (!cancelled) {
          setMetaError(error instanceof Error ? error.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    };

    void loadMetaData();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#232636] bg-[#10121b] px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#f7f8f8]">Marketing Hub</h1>
            <p className="text-xs sm:text-sm text-[#8a8f98] mt-1">
              Manage all your marketing channels from one place
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#1b1e2c] -mb-px">
          <nav className="flex space-x-6 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  type="button"
                  variant="ghost"
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  onClick={() => handleTabChange(tab.id)}
                  className={`min-h-0 whitespace-nowrap rounded-none border-b-2 px-1 py-3 text-xs sm:text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#5e6ad2] text-[#5e6ad2]'
                      : 'border-transparent text-[#8a8f98] hover:border-[#232636] hover:bg-transparent hover:text-[#f7f8f8]'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" aria-hidden="true" />
                  {tab.name}
                  {tab.badge && (
                    <span className="ml-2 px-2 py-0.5 bg-[#5e6ad2]/20 text-[#a5b4fc] rounded-full text-xs font-medium">
                      {tab.badge}
                    </span>
                  )}
                </Button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="p-4 sm:p-6">
            <MarketingHub />
          </div>
        )}
        {activeTab === 'social' && (
          <div className="p-4 sm:p-6">
            <MarketingHub />
          </div>
        )}
        {activeTab === 'meta' && (
          <div className="p-4 sm:p-6">
            <div className="space-y-6">
              <div className="bg-[#161824] border border-[#232636] rounded-lg p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-[#f7f8f8]">Meta Pixel Setup</h3>
                    <p className="text-xs sm:text-sm text-[#8a8f98]">Configure Pixel and Conversion API for campaign tracking</p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={async () => {
                      setMetaError(null);
                      try {
                        const response = await fetch('/api/admin/meta/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify(metaSetup),
                        });
                        if (!response.ok) {
                          throw new Error('Failed to save meta setup');
                        }
                        setMetaSaved(true);
                        window.setTimeout(() => setMetaSaved(false), 1500);
                      } catch (error) {
                        setMetaError(error instanceof Error ? error.message : 'Save failed');
                      }
                    }}
                    className="bg-[#5e6ad2] text-xs sm:text-sm hover:bg-[#6d78d5] text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] self-start sm:self-auto"
                  >
                    <Save className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Save Meta Setup
                  </Button>
                </div>
                {metaSaved && (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-[#10b981]/30 bg-[#10b981]/10 px-3 py-2 text-xs sm:text-sm text-[#34d399]">
                    <CheckCircle2 className="w-4 h-4" />
                    Meta settings saved
                  </div>
                )}
                {metaError && (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-xs sm:text-sm text-[#f87171]">
                    <span>{metaError}</span>
                  </div>
                )}
                {metaLoading && (
                  <div className="mb-4 text-xs text-[#8a8f98]">Loading meta setup...</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={metaSetup.pixelId}
                    onChange={(e) => setMetaSetup((prev) => ({ ...prev, pixelId: e.target.value }))}
                    placeholder="123456789012345"
                    label="Meta Pixel ID"
                  />
                  <Input
                    type="password"
                    value={metaSetup.conversionApiToken}
                    onChange={(e) => setMetaSetup((prev) => ({ ...prev, conversionApiToken: e.target.value }))}
                    placeholder="EAA..."
                    label="Conversion API Token"
                  />
                </div>
              </div>

              <div className="bg-[#161824] border border-[#232636] rounded-lg p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
                <h3 className="text-base sm:text-lg font-semibold text-[#f7f8f8] mb-4">Campaign Targeting</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    value={metaSetup.objective}
                    onChange={(e) => setMetaSetup((prev) => ({ ...prev, objective: e.target.value }))}
                    label="Objective"
                  >
                    <option value="sales">Sales</option>
                    <option value="traffic">Traffic</option>
                    <option value="leads">Leads</option>
                    <option value="engagement">Engagement</option>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={metaSetup.dailyBudgetBdt}
                    onChange={(e) => setMetaSetup((prev) => ({ ...prev, dailyBudgetBdt: Number(e.target.value) }))}
                    label="Daily Budget (BDT)"
                  />
                </div>
              </div>

              <div className="bg-[#161824] border border-[#232636] rounded-lg p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
                <h3 className="text-base sm:text-lg font-semibold text-[#f7f8f8] mb-4">Retarget Audiences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {audiencePresets.map((audience) => (
                    <Button
                      key={audience.id}
                      type="button"
                      variant="secondary"
                      aria-pressed={metaSetup.selectedAudiences.includes(audience.id)}
                      onClick={() =>
                        setMetaSetup((prev) => ({
                          ...prev,
                          selectedAudiences: prev.selectedAudiences.includes(audience.id)
                            ? prev.selectedAudiences.filter((id) => id !== audience.id)
                            : [...prev.selectedAudiences, audience.id],
                        }))
                      }
                      className={`h-auto min-h-11 flex-col items-start justify-start text-left p-3 rounded-md transition-colors ${
                        metaSetup.selectedAudiences.includes(audience.id)
                          ? 'border-[#5e6ad2] bg-[#5e6ad2]/15 text-[#f7f8f8]'
                          : 'border-[#232636] bg-[#10121b] text-[#8a8f98] hover:border-[#5e6ad2]/40'
                      }`}
                    >
                      <p className="text-xs sm:text-sm font-medium text-[#f7f8f8]">{audience.label}</p>
                      <p className="text-[11px] text-[#8a8f98]">Est. audience: {audience.size.toLocaleString()}</p>
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-md bg-[#10121b] border border-[#232636] p-4">
                    <p className="text-xs text-[#5e6ad2] flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5" />
                      Combined Reach
                    </p>
                    <p className="text-xl font-bold text-[#f7f8f8] mt-1">{selectedReach.toLocaleString()}</p>
                  </div>
                  <div className="rounded-md bg-[#10121b] border border-[#232636] p-4">
                    <p className="text-xs text-[#a5b4fc] flex items-center gap-1 font-medium">
                      <Target className="w-3.5 h-3.5" />
                      Suggested Strategy
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-[#f7f8f8] capitalize mt-1">
                      {metaSetup.objective} + retarget warm audience first
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'whatsapp' && (
          <WhatsAppIntegration />
        )}
        {activeTab === 'email' && (
          <div className="p-4 sm:p-6">
            <div className="bg-[#161824] border border-[#232636] rounded-lg p-6 sm:p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <Mail className="w-12 h-12 sm:w-16 sm:h-16 text-[#62666d] mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-semibold text-[#f7f8f8] mb-1.5">Email Marketing</h3>
              <p className="text-xs sm:text-sm text-[#8a8f98] mb-5 max-w-md mx-auto">
                Create and manage email campaigns, newsletters, and automated email sequences.
              </p>
              <Button type="button" variant="primary" className="bg-[#5e6ad2] hover:bg-[#6d78d5] text-white text-xs sm:text-sm font-medium">
                Create Email Campaign
              </Button>
            </div>
          </div>
        )}
        {activeTab === 'sms' && (
          <div className="p-4 sm:p-6">
            <div className="bg-[#161824] border border-[#232636] rounded-lg p-6 sm:p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <Bell className="w-12 h-12 sm:w-16 sm:h-16 text-[#62666d] mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-semibold text-[#f7f8f8] mb-1.5">SMS Marketing</h3>
              <p className="text-xs sm:text-sm text-[#8a8f98] mb-5 max-w-md mx-auto">
                Send SMS campaigns, order updates, and promotional messages to your customers.
              </p>
              <Button type="button" variant="primary" className="bg-[#5e6ad2] hover:bg-[#6d78d5] text-white text-xs sm:text-sm font-medium">
                Create SMS Campaign
              </Button>
            </div>
          </div>
        )}
        {activeTab === 'google' && (
          <div className="p-4 sm:p-6">
            <GoogleServicesIntegration />
          </div>
        )}
      </div>
    </div>
  );
}
