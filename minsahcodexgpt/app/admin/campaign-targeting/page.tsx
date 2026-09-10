'use client';



import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useState } from 'react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import {
  Target,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Copy,
} from 'lucide-react';
import { bangladeshLocations, getAllDivisions, getDistrictsByDivision, getThanasByDistrict } from '@/data/bangladesh-locations';

export default function CampaignTargetingPage() {
  const { hasPermission } = useAdminAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedThanas, setSelectedThanas] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [budget, setBudget] = useState('');

  // Mock campaign data - Replace with real API data
  type CampaignStatus = 'active' | 'paused' | 'draft' | 'ended';
  const campaigns: Array<{
    id: string;
    name: string;
    targetLocations: { divisions: string[]; districts: string[]; thanas: string[] };
    estimatedReach: number;
    budget: number;
    spent: number;
    startDate: Date;
    endDate: Date;
    status: CampaignStatus;
    performance: { impressions: number; clicks: number; conversions: number; revenue: number };
  }> = [
    {
      id: '1',
      name: 'Dhaka Metro Beauty Campaign',
      targetLocations: {
        divisions: ['Dhaka'],
        districts: ['Dhaka', 'Gazipur'],
        thanas: ['Dhanmondi', 'Gulshan', 'Mirpur', 'Uttara'],
      },
      estimatedReach: 45678,
      budget: 50000,
      spent: 23456,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      status: 'active',
      performance: {
        impressions: 123456,
        clicks: 5678,
        conversions: 234,
        revenue: 345678,
      },
    },
    {
      id: '2',
      name: 'Chittagong Coastal Campaign',
      targetLocations: {
        divisions: ['Chittagong'],
        districts: ['Chittagong', "Cox's Bazar"],
        thanas: ['Agrabad', 'Panchlaish', "Cox's Bazar Sadar"],
      },
      estimatedReach: 23456,
      budget: 30000,
      spent: 15678,
      startDate: new Date('2024-01-05'),
      endDate: new Date('2024-02-05'),
      status: 'active',
      performance: {
        impressions: 67890,
        clicks: 3456,
        conversions: 156,
        revenue: 234567,
      },
    },
    {
      id: '3',
      name: 'All Bangladesh New Year Sale',
      targetLocations: {
        divisions: getAllDivisions(),
        districts: [],
        thanas: [],
      },
      estimatedReach: 150000,
      budget: 100000,
      spent: 0,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-15'),
      status: 'draft',
      performance: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      },
    },
  ];

  if (!hasPermission(PERMISSIONS.CONTENT_MANAGE)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#8A8F98]">You don't have permission to manage campaign targeting.</p>
      </div>
    );
  }

  const handleDivisionToggle = (division: string) => {
    setSelectedDivisions(prev =>
      prev.includes(division)
        ? prev.filter(d => d !== division)
        : [...prev, division]
    );
  };

  const calculateEstimatedReach = () => {
    // Simple calculation based on selections
    let reach = 0;
    if (selectedDivisions.length > 0) reach += selectedDivisions.length * 10000;
    if (selectedDistricts.length > 0) reach += selectedDistricts.length * 3000;
    if (selectedThanas.length > 0) reach += selectedThanas.length * 500;
    return reach;
  };

  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalReach = campaigns.reduce((sum, c) => sum + c.estimatedReach, 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F7F8F8]">Location-Based Campaign Targeting</h1>
          <p className="text-[#8A8F98]">Create targeted campaigns for specific regions in Bangladesh</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#161824] rounded-xl border border-[#232636] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Active Campaigns</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">{activeCampaigns}</p>
              <p className="text-xs text-[#8A8F98] mt-1">of {campaigns.length} total</p>
            </div>
            <Target className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="bg-[#161824] rounded-xl border border-[#232636] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Total Reach</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">{totalReach.toLocaleString()}</p>
              <p className="text-xs text-[#8A8F98] mt-1">estimated customers</p>
            </div>
            <Users className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-[#161824] rounded-xl border border-[#232636] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Total Budget</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">৳{totalBudget.toLocaleString()}</p>
              <p className="text-xs text-[#8A8F98] mt-1">allocated</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-[#161824] rounded-xl border border-[#232636] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Spent</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">৳{totalSpent.toLocaleString()}</p>
              <p className="text-xs text-orange-600 mt-1">
                {((totalSpent / totalBudget) * 100).toFixed(1)}% of budget
              </p>
            </div>
            <Calendar className="w-10 h-10 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-[#161824] rounded-xl border border-[#232636] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#232636]">
          <h3 className="text-lg font-bold text-[#F7F8F8]">Active Campaigns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#10121b] border-b border-[#232636] text-[#8A8F98]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Target Locations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Reach
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Performance
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
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-[#1b1e2c]">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-[#F7F8F8]">{campaign.name}</p>
                      <div className="flex items-center text-xs text-[#8A8F98] mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {campaign.startDate.toLocaleDateString()} - {campaign.endDate.toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs space-y-1">
                      {campaign.targetLocations.divisions.length > 0 && (
                        <div className="flex items-center text-[#8A8F98]">
                          <MapPin className="w-3 h-3 mr-1" />
                          {campaign.targetLocations.divisions.length === getAllDivisions().length
                            ? 'All Bangladesh'
                            : `${campaign.targetLocations.divisions.length} division(s)`}
                        </div>
                      )}
                      {campaign.targetLocations.districts.length > 0 && (
                        <p className="text-[#8A8F98]">{campaign.targetLocations.districts.length} district(s)</p>
                      )}
                      {campaign.targetLocations.thanas.length > 0 && (
                        <p className="text-[#8A8F98]">{campaign.targetLocations.thanas.length} thana(s)</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-[#62666d] mr-1" />
                      <span className="text-sm text-[#F7F8F8]">{campaign.estimatedReach.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="font-medium text-[#F7F8F8]">৳{campaign.budget.toLocaleString()}</p>
                      <p className="text-xs text-[#8A8F98]">Spent: ৳{campaign.spent.toLocaleString()}</p>
                      <progress
                        className="mt-1 h-2 w-full accent-[#5e6ad2]"
                        max={Math.max(campaign.budget, 1)}
                        value={campaign.spent}
                        aria-label={`${campaign.name} budget spent`}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs space-y-1">
                      <p className="text-[#8A8F98]">{campaign.performance.impressions.toLocaleString()} impressions</p>
                      <p className="text-[#8A8F98]">{campaign.performance.clicks.toLocaleString()} clicks</p>
                      <p className="text-green-600 font-medium">{campaign.performance.conversions} conversions</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' :
                      campaign.status === 'paused' ? 'bg-amber-500/10 text-amber-300' :
                      'bg-[#10121b] text-[#f7f8f8]'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Button className="text-white hover:text-white-hover">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {campaign.status === 'active' ? (
                        <Button className="text-yellow-600 hover:text-yellow-900">
                          <Pause className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button className="text-green-600 hover:text-green-900">
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button className="text-[#5e6ad2] hover:text-blue-900">
                        <Copy className="w-4 h-4" />
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

      {/* Create Campaign Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Location-Based Campaign"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowCreateModal(false)}>Create Campaign</Button>
          </>
        }
      >
        <div className="space-y-6">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-[#d0d6e0] mb-2">Campaign Name</label>
                <Input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name"
                  className="w-full px-4 py-2 border border-[#232636] rounded-lg focus:ring-2 focus:ring-white/20 focus:border-admin-primary"
                />
              </div>

              {/* Division Selection */}
              <div>
                <label className="block text-sm font-medium text-[#d0d6e0] mb-2">Target Divisions</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {getAllDivisions().map(division => (
                    <label key={division} className="flex items-center space-x-2">
                      <Input
                        type="checkbox"
                        checked={selectedDivisions.includes(division)}
                        onChange={() => handleDivisionToggle(division)}
                        className="rounded border-[#232636] text-white focus:ring-white/20"
                      />
                      <span className="text-sm text-[#d0d6e0]">{division}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-[#d0d6e0] mb-2">Budget (BDT)</label>
                <Input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Enter budget amount"
                  className="w-full px-4 py-2 border border-[#232636] rounded-lg focus:ring-2 focus:ring-white/20 focus:border-admin-primary"
                />
              </div>

              {/* Estimated Reach */}
              <div className="bg-admin-panel rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#d0d6e0]">Estimated Reach</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {calculateEstimatedReach().toLocaleString()}
                    </p>
                    <p className="text-xs text-[#8A8F98] mt-1">potential customers</p>
                  </div>
                  <Target className="w-12 h-12 text-admin-text-muted" />
                </div>
              </div>
        </div>
      </Modal>
    </div>
  );
}
