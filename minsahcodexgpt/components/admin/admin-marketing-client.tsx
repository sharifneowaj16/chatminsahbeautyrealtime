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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Marketing Hub</h1>
              <p className="text-gray-600 mt-1">
                Manage all your marketing channels from one place
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 -mb-px">
            <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.name}
                    {tab.badge && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={
          'h-[calc(100vh-180px)]'
        }
      >
        {activeTab === 'overview' && (
          <div className="p-6">
            <MarketingHub />
          </div>
        )}
        {activeTab === 'social' && (
          <div className="p-6">
            <MarketingHub />
          </div>
        )}
        {activeTab === 'meta' && (
          <div className="p-6">
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Meta Pixel Setup</h3>
                    <p className="text-sm text-gray-600">Configure Pixel and Conversion API for campaign tracking</p>
                  </div>
                  <button
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
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Meta Setup
                  </button>
                </div>
                {metaSaved && (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Meta settings saved
                  </div>
                )}
                {metaError && (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <span>{metaError}</span>
                  </div>
                )}
                {metaLoading && (
                  <div className="mb-4 text-sm text-gray-500">Loading meta setup...</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Pixel ID</label>
                    <input
                      value={metaSetup.pixelId}
                      onChange={(e) => setMetaSetup((prev) => ({ ...prev, pixelId: e.target.value }))}
                      placeholder="123456789012345"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conversion API Token</label>
                    <input
                      type="password"
                      value={metaSetup.conversionApiToken}
                      onChange={(e) => setMetaSetup((prev) => ({ ...prev, conversionApiToken: e.target.value }))}
                      placeholder="EAA..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Targeting</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Objective</label>
                    <select
                      value={metaSetup.objective}
                      onChange={(e) => setMetaSetup((prev) => ({ ...prev, objective: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="sales">Sales</option>
                      <option value="traffic">Traffic</option>
                      <option value="leads">Leads</option>
                      <option value="engagement">Engagement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily Budget (BDT)</label>
                    <input
                      type="number"
                      min={0}
                      value={metaSetup.dailyBudgetBdt}
                      onChange={(e) => setMetaSetup((prev) => ({ ...prev, dailyBudgetBdt: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Retarget Audiences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {audiencePresets.map((audience) => (
                    <button
                      key={audience.id}
                      onClick={() =>
                        setMetaSetup((prev) => ({
                          ...prev,
                          selectedAudiences: prev.selectedAudiences.includes(audience.id)
                            ? prev.selectedAudiences.filter((id) => id !== audience.id)
                            : [...prev.selectedAudiences, audience.id],
                        }))
                      }
                      className={`rounded-lg border p-3 text-left ${
                        metaSetup.selectedAudiences.includes(audience.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">{audience.label}</p>
                      <p className="text-xs text-gray-500">Est. audience: {audience.size.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                    <p className="text-xs text-blue-700 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Combined Reach
                    </p>
                    <p className="text-xl font-bold text-blue-900">{selectedReach.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 border border-purple-100 p-4">
                    <p className="text-xs text-purple-700 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Suggested Strategy
                    </p>
                    <p className="text-sm font-medium text-purple-900 capitalize">
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
          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Marketing</h3>
              <p className="text-gray-600 mb-6">
                Create and manage email campaigns, newsletters, and automated email sequences.
              </p>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create Email Campaign
              </button>
            </div>
          </div>
        )}
        {activeTab === 'sms' && (
          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">SMS Marketing</h3>
              <p className="text-gray-600 mb-6">
                Send SMS campaigns, order updates, and promotional messages to your customers.
              </p>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create SMS Campaign
              </button>
            </div>
          </div>
        )}
        {activeTab === 'google' && (
          <div className="p-6">
            <GoogleServicesIntegration />
          </div>
        )}
      </div>
    </div>
  );
}
