'use client';




import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import {
  Target,
  Users,
  ShoppingCart,
  Eye,
  Clock,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Facebook,
  Instagram,
  Twitter,
  Search,
  Filter,
  Download,
} from 'lucide-react';

export default function RetargetingAudiencesPage() {
  const { hasPermission } = useAdminAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock retargeting audiences - Replace with real API data
  const audiences = [
    {
      id: '1',
      name: 'Cart Abandoners - Last 7 Days',
      description: 'Users who added items to cart but didn\'t purchase',
      platform: 'facebook',
      size: 3456,
      status: 'active',
      criteria: {
        events: ['AddToCart'],
        excludeEvents: ['Purchase'],
        timeWindow: 7,
      },
      performance: {
        impressions: 45678,
        clicks: 1234,
        conversions: 89,
        cost: 456.78,
        revenue: 2345.67,
        roas: 5.13,
      },
      createdAt: '2024-01-15',
      lastUpdated: '2024-01-20',
    },
    {
      id: '2',
      name: 'Product Viewers - No Cart',
      description: 'Viewed products but didn\'t add to cart in last 14 days',
      platform: 'google',
      size: 5678,
      status: 'active',
      criteria: {
        events: ['ViewContent'],
        excludeEvents: ['AddToCart'],
        timeWindow: 14,
      },
      performance: {
        impressions: 67890,
        clicks: 2345,
        conversions: 123,
        cost: 678.90,
        revenue: 3456.78,
        roas: 5.09,
      },
      createdAt: '2024-01-10',
      lastUpdated: '2024-01-20',
    },
    {
      id: '3',
      name: 'Past Purchasers - 30 Days',
      description: 'Customers who purchased in last 30 days',
      platform: 'all',
      size: 1234,
      status: 'active',
      criteria: {
        events: ['Purchase'],
        timeWindow: 30,
      },
      performance: {
        impressions: 23456,
        clicks: 890,
        conversions: 67,
        cost: 345.67,
        revenue: 2234.56,
        roas: 6.47,
      },
      createdAt: '2024-01-05',
      lastUpdated: '2024-01-20',
    },
    {
      id: '4',
      name: 'High Intent Shoppers',
      description: '3+ sessions, 10+ page views in last 30 days',
      platform: 'tiktok',
      size: 2345,
      status: 'active',
      criteria: {
        minSessions: 3,
        minPageViews: 10,
        timeWindow: 30,
      },
      performance: {
        impressions: 34567,
        clicks: 1234,
        conversions: 78,
        cost: 567.89,
        revenue: 1876.54,
        roas: 3.30,
      },
      createdAt: '2024-01-12',
      lastUpdated: '2024-01-20',
    },
    {
      id: '5',
      name: 'Win-Back Customers',
      description: 'Last purchase over 90 days ago',
      platform: 'facebook',
      size: 987,
      status: 'paused',
      criteria: {
        events: ['Purchase'],
        daysSinceEvent: 90,
      },
      performance: {
        impressions: 12345,
        clicks: 456,
        conversions: 23,
        cost: 234.56,
        revenue: 1234.56,
        roas: 5.26,
      },
      createdAt: '2024-01-01',
      lastUpdated: '2024-01-18',
    },
  ];

  if (!hasPermission(PERMISSIONS.ANALYTICS_VIEW)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#8a8f98]">You don't have permission to view retargeting audiences.</p>
      </div>
    );
  }

  const filteredAudiences = audiences.filter(audience => {
    const matchesSearch = audience.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         audience.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || audience.platform === filterPlatform;
    const matchesStatus = filterStatus === 'all' || audience.status === filterStatus;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="w-4 h-4" />;
      case 'google':
        return <Search className="w-4 h-4" />;
      case 'tiktok':
        return <Target className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'twitter':
        return <Twitter className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return 'bg-[#5e6ad2]/20 text-[#f7f8f8]';
      case 'google':
        return 'bg-red-100 text-rose-300';
      case 'tiktok':
        return 'bg-admin-panel text-white';
      case 'instagram':
        return 'bg-admin-panel text-white';
      case 'twitter':
        return 'bg-sky-100 text-sky-800';
      default:
        return 'bg-[#10121b] text-[#f7f8f8]';
    }
  };

  const totalAudienceSize = audiences.reduce((sum, aud) => sum + aud.size, 0);
  const activeAudiences = audiences.filter(aud => aud.status === 'active').length;
  const totalImpressions = audiences.reduce((sum, aud) => sum + aud.performance.impressions, 0);
  const avgROAS = audiences.reduce((sum, aud) => sum + aud.performance.roas, 0) / audiences.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F7F8F8]">Retargeting Audiences</h1>
          <p className="text-[#8a8f98]">Build and manage custom audiences for retargeting campaigns</p>
        </div>
        <Button className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-lg">
          <Plus className="w-5 h-5 mr-2" />
          Create Audience
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#161824] rounded-xl border border-[#232636] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Total Audiences</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">{audiences.length}</p>
              <p className="text-xs text-[#62666D] mt-1">{activeAudiences} active</p>
            </div>
            <Target className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="bg-[#161824] rounded-xl border border-[#232636] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Total Reach</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">{totalAudienceSize.toLocaleString()}</p>
              <p className="text-xs text-[#62666D] mt-1">unique users</p>
            </div>
            <Users className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-[#161824] rounded-xl border border-[#232636] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Total Impressions</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">{totalImpressions.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">+23.4% this month</p>
            </div>
            <Eye className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-[#161824] rounded-xl border border-[#232636] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Avg ROAS</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">{avgROAS.toFixed(2)}x</p>
              <p className="text-xs text-green-600 mt-1">+12.5% vs last period</p>
            </div>
            <TrendingUp className="w-10 h-10 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#161824] rounded-xl border border-[#232636] p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#62666d]" />
            <Input
              type="text"
              placeholder="Search audiences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#232636] bg-[#10121b] text-[#F7F8F8] placeholder-[#62666D] rounded-lg focus:ring-1 focus:ring-white/20"
            />
          </div>

          <Select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="px-4 py-2 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-lg focus:ring-1 focus:ring-white/20"
          >
            <option value="all">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="google">Google</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter</option>
          </Select>

          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-lg focus:ring-1 focus:ring-white/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
          </Select>
        </div>
      </div>

      {/* Audiences List */}
      <div className="bg-[#161824] rounded-xl border border-[#232636] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#10121b]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Audience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  ROAS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232636]">
              {filteredAudiences.map((audience) => (
                <tr key={audience.id} className="hover:bg-[#1b1e2c]/70 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-[#F7F8F8]">{audience.name}</p>
                      <p className="text-xs text-[#62666D]">{audience.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(audience.platform)}`}>
                      {getPlatformIcon(audience.platform)}
                      <span className="ml-1 capitalize">{audience.platform}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-[#62666d] mr-1" />
                      <span className="text-sm text-[#F7F8F8]">{audience.size.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center text-[#8A8F98]">
                        <Eye className="w-3 h-3 mr-1" />
                        {audience.performance.impressions.toLocaleString()} impressions
                      </div>
                      <div className="flex items-center text-[#8A8F98]">
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        {audience.performance.conversions} conversions
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-semibold ${
                      audience.performance.roas >= 4 ? 'text-green-600' :
                      audience.performance.roas >= 2 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {audience.performance.roas.toFixed(2)}x
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      audience.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' :
                      audience.status === 'paused' ? 'bg-amber-500/10 text-amber-300' :
                      'bg-[#10121b] text-[#f7f8f8]'
                    }`}>
                      {audience.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Button className="text-white hover:text-[#FFFFFF]">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {audience.status === 'active' ? (
                        <Button className="text-yellow-600 hover:text-yellow-900">
                          <Pause className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button className="text-green-600 hover:text-green-900">
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button className="text-[#5e6ad2] hover:text-blue-900">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAudiences.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-[#d0d6e0] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#F7F8F8] mb-2">No audiences found</h3>
          <p className="text-[#8A8F98] mb-6">
            {searchQuery || filterPlatform !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first retargeting audience to get started'}
          </p>
          {!searchQuery && filterPlatform === 'all' && filterStatus === 'all' && (
            <Button className="inline-flex items-center px-6 py-3 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-lg">
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Audience
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
