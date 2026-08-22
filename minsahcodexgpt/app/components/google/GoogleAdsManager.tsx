'use client';



import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useState, useEffect } from 'react';
import type { GoogleAdsCampaign } from '@/types/google';
import { generateMockGoogleAdsCampaigns, GOOGLE_COLORS } from '@/types/google';
import { formatPrice } from '@/utils/currency';
import {
  Play,
  Pause,
  Square,
  Plus,
  BarChart,
  Eye,
  DollarSign,
  TrendingUp,
  TrendingDown,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  ShoppingBag,
  Palette,
  Video,
  Banknote,
  Search,
} from 'lucide-react';

interface GoogleAdsManagerProps {
  className?: string;
}

export default function GoogleAdsManager({ className = '' }: GoogleAdsManagerProps) {
  const { requestConfirmation } = useToast();
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<GoogleAdsCampaign | null>(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [filter, setFilter] = useState<'all' | 'search' | 'shopping' | 'display' | 'youtube'>('all');
  const [campaignStats, setCampaignStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    totalBudget: 0,
    totalSpent: 0,
    totalConversions: 0,
    totalRevenue: 0,
    avgROAS: 0
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockCampaigns = generateMockGoogleAdsCampaigns();
      setCampaigns(mockCampaigns);

      // Calculate stats
      const stats = {
        total: mockCampaigns.length,
        active: mockCampaigns.filter(c => c.status === 'active').length,
        paused: mockCampaigns.filter(c => c.status === 'paused').length,
        totalBudget: mockCampaigns.reduce((sum, c) => sum + c.budget, 0),
        totalSpent: mockCampaigns.reduce((sum, c) => sum + c.spent, 0),
        totalConversions: mockCampaigns.reduce((sum, c) => sum + c.conversions, 0),
        totalRevenue: mockCampaigns.reduce((sum, c) => sum + (c.conversions * c.cpa), 0),
        avgROAS: mockCampaigns.length > 0
          ? mockCampaigns.reduce((sum, c) => sum + c.roas, 0) / mockCampaigns.length
          : 0
      };
      setCampaignStats(stats);
    } catch (err) {
      setError('Failed to load Google Ads data');
      console.error('Error loading Google Ads data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: GoogleAdsCampaign['status']) => {
    switch (status) {
      case 'active':
        return <Play className="h-5 w-5 text-green-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      case 'ended':
        return <Square className="h-5 w-5 text-red-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: GoogleAdsCampaign['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ended':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: GoogleAdsCampaign['status']) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'ended':
        return 'Ended';
      default:
        return 'Unknown';
    }
  };

  const getCampaignTypeIcon = (type: GoogleAdsCampaign['type']) => {
    const iconProps = "h-5 w-5";

    switch (type) {
      case 'search':
        return <Search className={iconProps} />;
      case 'shopping':
        return <ShoppingBag className={iconProps} />;
      case 'display':
        return <Palette className={iconProps} />;
      case 'youtube':
        return <Video className={iconProps} />;
      case 'performance_max':
        return <BarChart className={iconProps} />;
      default:
        return <Banknote className={iconProps} />;
    }
  };

  const getCampaignTypeName = (type: GoogleAdsCampaign['type']) => {
    switch (type) {
      case 'search':
        return 'Search Ads';
      case 'shopping':
        return 'Shopping Ads';
      case 'display':
        return 'Display Ads';
      case 'youtube':
        return 'YouTube Ads';
      case 'performance_max':
        return 'Performance Max';
      default:
        return 'Unknown';
    }
  };

  const handleCreateCampaign = async (campaignData: Partial<GoogleAdsCampaign>) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newCampaign: GoogleAdsCampaign = {
        id: Date.now().toString(),
        name: campaignData.name || 'New Campaign',
        type: campaignData.type || 'search',
        status: 'active',
        budget: campaignData.budget || 100,
        budgetType: 'daily',
        spent: 0,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        conversions: 0,
        cpa: 0,
        cpc: 0,
        roas: 0,
        startDate: new Date(),
        targeting: {
          locations: ['Bangladesh'],
          languages: ['en'],
          devices: ['mobile', 'desktop'],
          demographics: {}
        },
        adGroups: [{
          id: Date.now().toString(),
          name: 'Default Ad Group',
          ads: [{
            id: Date.now().toString(),
            type: 'text',
            headline: campaignData.name || 'New Campaign'
          }]
        }],
        performance: {
          searchImpressionShare: 0,
          avgPosition: 0,
          topOfPageRate: 0
        }
      };

      setCampaigns(prev => [newCampaign, ...prev]);
      setShowCreateCampaign(false);
    } catch (err) {
      console.error('Error creating campaign:', err);
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    setCampaigns(prev =>
      prev.map(campaign =>
        campaign.id === campaignId
          ? { ...campaign, status: 'paused' }
          : campaign
      )
    );
  };

  const handleResumeCampaign = async (campaignId: string) => {
    setCampaigns(prev =>
      prev.map(campaign =>
        campaign.id === campaignId
          ? { ...campaign, status: 'active' }
          : campaign
      )
    );
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (await requestConfirmation({ title: 'Delete this campaign?', description: 'The campaign will be removed from this Google Ads view.', confirmLabel: 'Delete campaign', tone: 'danger' })) {
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign(null);
      }
    }
  };

  const getChangeIndicator = (current: number, previous: number) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    if (change > 0) {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-4 w-4" />
          <span>{Math.abs(change).toFixed(1)}%</span>
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center gap-1 text-red-600">
          <TrendingDown className="h-4 w-4" />
          <span>{Math.abs(change).toFixed(1)}%</span>
        </span>
      );
    }
    return null;
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    filter === 'all' || campaign.type === filter
  );

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-6"></div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>

          <div className="h-40 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center gap-3 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Google Ads Manager</h2>
              <p className="text-sm text-gray-600">Create and manage advertising campaigns</p>
            </div>
          </div>

          <Button
            onClick={() => setShowCreateCampaign(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-700 font-medium">Active Campaigns</span>
              <Play className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">{campaignStats.active}</p>
            <p className="text-xs text-blue-700">of {campaignStats.total} total</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-700 font-medium">Daily Budget</span>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">{formatPrice(campaignStats.totalBudget)}</p>
            <p className="text-xs text-green-700">per day</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-minsah-action-primary font-medium">Total Spend</span>
              <TrendingUp className="h-4 w-4 text-minsah-action-primary" />
            </div>
            <p className="text-2xl font-bold text-purple-900">{formatPrice(campaignStats.totalSpent)}</p>
            <p className="text-xs text-minsah-action-primary">all campaigns</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-700 font-medium">Avg ROAS</span>
              <BarChart className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-900">{campaignStats.avgROAS.toFixed(0)}%</p>
            <p className="text-xs text-orange-700">return on ad spend</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex space-x-1">
          {(['all', 'search', 'shopping', 'display', 'youtube'] as const).map((type) => (
            <Button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                filter === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All Campaigns' : getCampaignTypeName(type as GoogleAdsCampaign['type'])}
            </Button>
          ))}
        </div>
      </div>

      {/* Campaigns List */}
      <div className="p-6">
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCampaignTypeIcon(campaign.type)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(campaign.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                        {getStatusText(campaign.status)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getCampaignTypeName(campaign.type)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg">
                    {campaign.budgetType === 'daily' ? '৳' : ''}{formatPrice(campaign.budget)}/day
                  </span>
                  <Button className="text-blue-600 hover:text-blue-700 underline text-sm">
                    Edit
                  </Button>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Impressions</p>
                  <p className="text-lg font-bold text-gray-900">
                    {campaign.impressions.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">↑ 12.3%</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Clicks</p>
                  <p className="text-lg font-bold text-gray-900">
                    {campaign.clicks.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600">↑ 8.7%</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">CTR</p>
                  <p className="text-lg font-bold text-gray-900">
                    {campaign.ctr.toFixed(1)}%
                  </p>
                  <p className="text-xs text-green-600">↑ 0.3%</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Conversions</p>
                  <p className="text-lg font-bold text-gray-900">
                    {campaign.conversions}
                  </p>
                  <p className="text-xs text-orange-600">CPA: {formatPrice(campaign.cpa)}</p>
                </div>
              </div>

              {/* Targeting Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                <div>
                  <p className="font-medium text-gray-900 mb-1">Targeting:</p>
                  <ul className="space-y-1">
                    <li>• {campaign.targeting.locations.join(', ')}</li>
                    <li>• {campaign.targeting.devices.join(', ')}</li>
                    {campaign.targeting.demographics?.age && (
                      <li>• Age: {campaign.targeting.demographics.age.join(', ')}</li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="font-medium text-gray-900 mb-1">Performance:</p>
                  <ul className="space-y-1">
                    <li>• Search Impression Share: {campaign.performance.searchImpressionShare.toFixed(1)}%</li>
                    <li>• Avg Position: {campaign.performance.avgPosition.toFixed(1)}</li>
                    <li>• Top of Page Rate: {campaign.performance.topOfPageRate.toFixed(1)}%</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {campaign.status === 'active' ? (
                  <>
                    <Button
                      onClick={() => handlePauseCampaign(campaign.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors duration-200"
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                    <Button className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200">
                      <BarChart className="h-4 w-4" />
                      Analytics
                    </Button>
                  </>
                ) : campaign.status === 'paused' ? (
                  <>
                    <Button
                      onClick={() => handleResumeCampaign(campaign.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
                    >
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                    <Button className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200">
                      <Square className="h-4 w-4" />
                      End
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}

                <Button
                  onClick={() => setSelectedCampaign(campaign)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  <Eye className="h-4 w-4" />
                  Details
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* No Campaigns */}
        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💰</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all'
                ? 'Create your first Google Ads campaign to start advertising'
                : `No ${getCampaignTypeName(filter as GoogleAdsCampaign['type'])} campaigns found`
              }
            </p>
            <Button
              onClick={() => setShowCreateCampaign(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </div>
        )}
      </div>

      {/* Campaign Detail Modal */}
      {selectedCampaign ? (
        <Modal open onClose={() => setSelectedCampaign(null)} title="Campaign Details" size="xl">
              <div>
                <div className="space-y-6">
                  {/* Campaign Overview */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Campaign Overview</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Campaign Name</p>
                          <p className="font-medium text-gray-900">{selectedCampaign.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Type</p>
                          <p className="font-medium text-gray-900">
                            {getCampaignTypeName(selectedCampaign.type)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(selectedCampaign.status)}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedCampaign.status)}`}>
                              {getStatusText(selectedCampaign.status)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Budget</p>
                          <p className="font-medium text-gray-900">
                            {formatPrice(selectedCampaign.budget)}/day
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Start Date</p>
                          <p className="font-medium text-gray-900">
                            {selectedCampaign.startDate.toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ROAS</p>
                          <p className="font-medium text-gray-900">
                            {selectedCampaign.roas.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ad Groups */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Ad Groups</h4>
                    <div className="space-y-3">
                      {selectedCampaign.adGroups.map((adGroup) => (
                        <div key={adGroup.id} className="border border-gray-200 rounded-lg p-4">
                          <p className="font-medium text-gray-900">{adGroup.name}</p>
                          <div className="mt-2 space-y-2">
                            {adGroup.ads.map((ad) => (
                              <div key={ad.id} className="bg-gray-50 rounded p-2">
                                <p className="text-sm text-gray-700">
                                  <strong>{ad.type.toUpperCase()}:</strong> {ad.headline}
                                </p>
                                {ad.description && (
                                  <p className="text-xs text-gray-600 mt-1">{ad.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
        </Modal>
      ) : null}
    </div>
  );
}
