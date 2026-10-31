'use client';



import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import {
  Crown,
  Award,
  Gift,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Star,
  Download,
  Filter,
  Send,
} from 'lucide-react';
import { formatPrice, convertUSDtoBDT } from '@/utils/currency';
import { getAllDivisions } from '@/data/bangladesh-locations';

interface TopCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: {
    division: string;
    district: string;
    thana: string;
    area: string;
  };
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  firstOrderDate: Date;
  lastOrderDate: Date;
  loyaltyPoints: number;
  tier: 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze';
  yearlyGiftEligible: boolean;
  yearlyGiftAwarded?: {
    year: number;
    giftName: string;
    giftValue: number;
    awardedDate: Date;
  };
}

export default function TopCustomersPage() {
  const { hasPermission } = useAdminAuth();
  const [filterDivision, setFilterDivision] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterYear, setFilterYear] = useState('2024');
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTopCustomers() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/customers?sortBy=totalSpent&sortOrder=desc&limit=50');
        if (!res.ok) {
          setTopCustomers([]);
          return;
        }
        const data = await res.json();
        const rawList = Array.isArray(data.customers) ? data.customers : [];
        const mapped: TopCustomer[] = rawList.map((c: any) => {
          const spent = Number(c.totalSpent) || 0;
          const tier = spent >= 40000 ? 'diamond' : spent >= 30000 ? 'platinum' : spent >= 20000 ? 'gold' : spent >= 10000 ? 'silver' : 'bronze';
          return {
            id: c.id,
            name: c.name || c.email || 'Customer',
            email: c.email || '',
            phone: c.phone || 'N/A',
            location: {
              division: c.address?.state || c.address?.city || 'Dhaka',
              district: c.address?.city || 'Dhaka',
              thana: c.address?.city || 'General',
              area: c.address?.address1 || c.address?.city || 'N/A',
            },
            totalOrders: Number(c.totalOrders) || 0,
            totalSpent: spent,
            avgOrderValue: Number(c.averageOrderValue) || 0,
            firstOrderDate: c.joinDate ? new Date(c.joinDate) : new Date(),
            lastOrderDate: c.lastLogin ? new Date(c.lastLogin) : new Date(),
            loyaltyPoints: Number(c.loyaltyPoints) || 0,
            tier: tier as any,
            yearlyGiftEligible: spent >= 25000,
          };
        });
        setTopCustomers(mapped);
      } catch (err) {
        console.error('Failed to load top customers:', err);
        setTopCustomers([]);
      } finally {
        setLoading(false);
      }
    }
    loadTopCustomers();
  }, []);

  if (!hasPermission(PERMISSIONS.CUSTOMERS_VIEW)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#8A8F98]">You don't have permission to view top customers.</p>
      </div>
    );
  }

  const filteredCustomers = topCustomers.filter(customer => {
    const matchesDivision = filterDivision === 'all' || customer.location.division === filterDivision;
    const matchesTier = filterTier === 'all' || customer.tier === filterTier;
    return matchesDivision && matchesTier;
  });

  const getTierBadge = (tier: string) => {
    const badges = {
      diamond: { color: 'bg-cyan-100 text-cyan-800', icon: 'D' },
      platinum: { color: 'bg-admin-panel text-white', icon: 'P' },
      gold: { color: 'bg-amber-500/10 text-amber-300', icon: 'G' },
      silver: { color: 'bg-[#10121b] text-[#f7f8f8]', icon: 'S' },
      bronze: { color: 'bg-orange-100 text-orange-800', icon: 'B' },
    };
    return badges[tier as keyof typeof badges] || badges.bronze;
  };

  const eligibleForGift = filteredCustomers.filter(c => c.yearlyGiftEligible).length;
  const totalSpent = filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalOrders = filteredCustomers.reduce((sum, c) => sum + c.totalOrders, 0);
  const avgSpent = filteredCustomers.length > 0 ? totalSpent / filteredCustomers.length : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F7F8F8]">Top Customers by Region</h1>
          <p className="text-sm text-[#8A8F98] mt-1">Identify and reward your most valuable customers</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <Button className="inline-flex items-center px-4 py-2 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-lg">
            <Gift className="w-5 h-5 mr-2" />
            Award Yearly Gifts
          </Button>
          <Button className="inline-flex items-center px-4 py-2 border border-[#232636] bg-[#161824] text-[#8A8F98] hover:text-[#F7F8F8] rounded-lg hover:bg-[#1b1e2c]">
            <Download className="w-5 h-5 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#161824] rounded-lg border border-[#232636] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Top Customers</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">{filteredCustomers.length}</p>
              <p className="text-xs text-[#8A8F98] mt-1">Active customers</p>
            </div>
            <Crown className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="bg-[#161824] rounded-lg border border-[#232636] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Total Revenue</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">
                {formatPrice(convertUSDtoBDT(totalSpent))}
              </p>
              <p className="text-xs text-green-600 mt-1">From top customers</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-[#161824] rounded-lg border border-[#232636] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Avg Customer Value</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">
                {formatPrice(convertUSDtoBDT(avgSpent))}
              </p>
              <p className="text-xs text-[#8A8F98] mt-1">Per customer</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-[#161824] rounded-lg border border-[#232636] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A8F98]">Gift Eligible</p>
              <p className="text-2xl font-bold text-[#F7F8F8] mt-2">{eligibleForGift}</p>
              <p className="text-xs text-orange-600 mt-1">For {filterYear} gifts</p>
            </div>
            <Gift className="w-10 h-10 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#161824] rounded-lg border border-[#232636] p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            value={filterDivision}
            onChange={(e) => setFilterDivision(e.target.value)}
            className="px-4 py-2 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-lg focus:ring-2 focus:ring-white/20 focus:border-admin-primary"
          >
            <option value="all">All Divisions</option>
            {getAllDivisions().map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </Select>

          <Select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-4 py-2 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-lg focus:ring-2 focus:ring-white/20 focus:border-admin-primary"
          >
            <option value="all">All Tiers</option>
            <option value="diamond">Diamond</option>
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="bronze">Bronze</option>
          </Select>

          <Select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-4 py-2 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-lg focus:ring-2 focus:ring-white/20 focus:border-admin-primary"
          >
            <option value="2024">2024 Gifts</option>
            <option value="2023">2023 Gifts</option>
            <option value="2022">2022 Gifts</option>
          </Select>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="bg-[#161824] rounded-lg border border-[#232636] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#10121b] border-b border-[#232636]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Yearly Gift
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232636]">
              {filteredCustomers.map((customer, index) => {
                const tierBadge = getTierBadge(customer.tier);
                return (
                  <tr key={customer.id} className="hover:bg-[#1b1e2c]/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {index < 3 ? (
                          <Crown className="w-6 h-6 text-yellow-500 mr-2" />
                        ) : (
                          <span className="text-sm font-semibold text-[#8A8F98] mr-2">#{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#F7F8F8]">{customer.name}</p>
                        <div className="flex items-center text-xs text-[#8A8F98] mt-1">
                          <Mail className="w-3 h-3 mr-1" />
                          {customer.email}
                        </div>
                        <div className="flex items-center text-xs text-[#8A8F98]">
                          <Phone className="w-3 h-3 mr-1" />
                          {customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-white mr-1" />
                        <div className="text-sm">
                          <p className="font-medium text-[#F7F8F8]">{customer.location.thana}</p>
                          <p className="text-xs text-[#8A8F98]">{customer.location.district}, {customer.location.division}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-[#F7F8F8]">
                        {formatPrice(convertUSDtoBDT(customer.totalSpent))}
                      </p>
                      <p className="text-xs text-[#8A8F98]">
                        Avg: {formatPrice(convertUSDtoBDT(customer.avgOrderValue))}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <ShoppingCart className="w-4 h-4 text-[#62666d] mr-1" />
                        <span className="text-sm text-[#F7F8F8]">{customer.totalOrders}</span>
                      </div>
                      <p className="text-xs text-[#8A8F98]">{customer.loyaltyPoints} pts</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tierBadge.color}`}>
                        <span className="mr-1">{tierBadge.icon}</span>
                        <span className="capitalize">{customer.tier}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {customer.yearlyGiftEligible ? (
                        customer.yearlyGiftAwarded ? (
                          <div className="text-xs">
                            <p className="text-green-600 font-medium flex items-center">
                              <Award className="w-3 h-3 mr-1" />
                              Awarded {customer.yearlyGiftAwarded.year}
                            </p>
                            <p className="text-[#8A8F98]">{customer.yearlyGiftAwarded.giftName}</p>
                          </div>
                        ) : (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                            Eligible
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-[#62666d]">Not eligible</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {customer.yearlyGiftEligible && !customer.yearlyGiftAwarded && (
                          <Button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowGiftModal(true);
                            }}
                            className="text-white hover:text-white-hover"
                          >
                            <Gift className="w-5 h-5" />
                          </Button>
                        )}
                        <Button className="text-[#5e6ad2] hover:text-blue-900">
                          <Send className="w-5 h-5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Crown className="w-16 h-16 text-[#d0d6e0] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#F7F8F8] mb-2">No top customers found</h3>
          <p className="text-[#8A8F98]">
            {loading ? 'Loading customer records...' : 'No customer purchase records match your filter criteria'}
          </p>
        </div>
      )}
    </div>
  );
}
