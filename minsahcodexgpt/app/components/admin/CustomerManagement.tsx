'use client';





import { useToast } from '@/components/ui/ToastProvider';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useState, useEffect } from 'react';
import type { AdminCustomer } from '@/types/admin';
import { generateMockCustomers } from '@/types/admin';
import {
  Search,
  Plus,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  Star,
  CreditCard,
  BarChart,
  Users,
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Edit,
  Trash2,
  Eye,
  Tag,
  Gift,
  Bell,
  MessageCircle
} from 'lucide-react';
import { Star as StarIconSolid } from 'lucide-react';

export default function CustomerManagement() {
  const { pushToast } = useToast();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSegmentManager, setShowSegmentManager] = useState(false);
  const [showVipManager, setShowVipManager] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterAndSortCustomers();
  }, [customers, searchQuery, selectedSegment, selectedStatus, sortBy]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockCustomers = generateMockCustomers();
      setCustomers(mockCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCustomers = () => {
    let filtered = [...customers];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery)
      );
    }

    // Filter by segment
    if (selectedSegment !== 'all') {
      filtered = filtered.filter(customer => customer.rfm.score === selectedSegment);
    }

    // Filter by status
    if (selectedStatus === 'vip') {
      filtered = filtered.filter(customer => customer.isVip);
    } else if (selectedStatus === 'active') {
      filtered = filtered.filter(customer =>
        new Date(customer.stats.lastOrderDate).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000
      );
    } else if (selectedStatus === 'inactive') {
      filtered = filtered.filter(customer =>
        new Date(customer.stats.lastOrderDate).getTime() <= Date.now() - 90 * 24 * 60 * 60 * 1000
      );
    }

    // Sort customers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'orders':
          return b.stats.totalOrders - a.stats.totalOrders;
        case 'spent':
          return b.stats.totalSpent - a.stats.totalSpent;
        case 'recency':
          return new Date(b.stats.lastOrderDate).getTime() - new Date(a.stats.lastOrderDate).getTime();
        case 'rfm':
          return b.rfm.recency + b.rfm.frequency + b.rfm.monetary -
                 (a.rfm.recency + a.rfm.frequency + a.rfm.monetary);
        default:
          return 0;
      }
    });

    setFilteredCustomers(filtered);
  };

  const getSegmentColor = (score: string) => {
    switch (score) {
      case 'vip': return 'bg-[#5e6ad2]/20 text-[#a5b4fc] border-[#5e6ad2]/40';
      case 'loyal': return 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]/30';
      case 'at-risk': return 'bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30';
      case 'lost': return 'bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30';
      case 'new': return 'bg-[#3b82f6]/15 text-[#60a5fa] border-[#3b82f6]/30';
      default: return 'bg-[#232636] text-[#8a8f98] border-[#232636]';
    }
  };

  const getSegmentIcon = (score: string) => {
    switch (score) {
      case 'vip': return <Crown className="h-4 w-4" />;
      case 'loyal': return <Star className="h-4 w-4" />;
      case 'at-risk': return <AlertTriangle className="h-4 w-4" />;
      case 'lost': return <Clock className="h-4 w-4" />;
      case 'new': return <CheckCircle className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const calculateRFMScore = (customer: AdminCustomer) => {
    const { recency, frequency, monetary } = customer.rfm;
    return Math.round((recency + frequency + monetary) / 3);
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const handleBulkEmail = () => {
    if (selectedCustomers.length > 0) {
      // Simulate bulk email action
      pushToast({ tone: 'info', description: `Sending email to ${selectedCustomers.length} customers` });
      setSelectedCustomers([]);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID', 'Name', 'Email', 'Phone', 'Total Orders', 'Total Spent', 'Avg Order Value',
      'RFM Score', 'Segment', 'Last Order Date', 'Is VIP'
    ];

    const csvData = filteredCustomers.map(customer => [
      customer.id,
      customer.name,
      customer.email,
      customer.phone || '',
      customer.stats.totalOrders.toString(),
      customer.stats.totalSpent.toString(),
      customer.stats.avgOrderValue.toString(),
      calculateRFMScore(customer).toString(),
      customer.rfm.score,
      customer.stats.lastOrderDate,
      customer.isVip.toString()
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
  };

  const sendNotification = async (customerId: string, type: string) => {
    // Simulate notification API call
    console.log(`Sending ${type} notification to customer ${customerId}`);
    pushToast({ tone: 'success', description: `${type} notification sent successfully!` });
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-[#232636] rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-[#161824] border border-[#232636] rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-[#161824] border border-[#232636] rounded-lg p-4">
                <div className="h-20 bg-[#232636] rounded-full w-20 mx-auto mb-3"></div>
                <div className="h-4 bg-[#232636] rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-3 bg-[#232636] rounded w-1/2 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#f7f8f8]">Customer Management</h1>
          <p className="text-xs sm:text-sm text-[#8a8f98]">Manage customers and analyze behavior</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            onClick={() => setShowSegmentManager(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#161824] hover:bg-[#1b1e2c] border border-[#232636] text-[#f7f8f8] rounded-md text-xs sm:text-sm font-medium transition-colors"
          >
            <Users className="h-4 w-4 text-[#8a8f98]" />
            Manage Segments
          </Button>
          <Button
            onClick={() => setShowVipManager(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#161824] hover:bg-[#1b1e2c] border border-[#232636] text-[#f7f8f8] rounded-md text-xs sm:text-sm font-medium transition-colors"
          >
            <Crown className="h-4 w-4 text-[#eab308]" />
            VIP Customers
          </Button>
          <Button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-[#161824] hover:bg-[#1b1e2c] border border-[#232636] text-[#f7f8f8] rounded-md text-xs sm:text-sm font-medium transition-colors"
          >
            <Download className="h-4 w-4 text-[#8a8f98]" />
            Export CSV
          </Button>
          <Button className="flex items-center gap-2 px-3.5 py-2 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white rounded-md text-xs sm:text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-[#161824] border border-[#232636] rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8a8f98] font-medium">Total Customers</span>
            <Users className="h-4 w-4 text-[#5e6ad2]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8]">{customers.length.toLocaleString()}</p>
          <p className="text-[#34d399] text-xs mt-1">+12% from last month</p>
        </div>

        <div className="bg-[#161824] border border-[#232636] rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8a8f98] font-medium">VIP Customers</span>
            <Crown className="h-4 w-4 text-[#eab308]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8]">{customers.filter(c => c.isVip).length}</p>
          <p className="text-[#a5b4fc] text-xs mt-1">Top tier</p>
        </div>

        <div className="bg-[#161824] border border-[#232636] rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8a8f98] font-medium">Active</span>
            <CheckCircle className="h-4 w-4 text-[#10b981]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8]">
            {customers.filter(c =>
              new Date(c.stats.lastOrderDate).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000
            ).length}
          </p>
          <p className="text-[#8a8f98] text-xs mt-1">Last 90 days</p>
        </div>

        <div className="bg-[#161824] border border-[#232636] rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8a8f98] font-medium">At Risk</span>
            <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8]">
            {customers.filter(c => c.rfm.score === 'at-risk').length}
          </p>
          <p className="text-[#fbbf24] text-xs mt-1">Need attention</p>
        </div>

        <div className="bg-[#161824] border border-[#232636] rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8a8f98] font-medium">New</span>
            <CheckCircle className="h-4 w-4 text-[#60a5fa]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8]">
            {customers.filter(c => c.rfm.score === 'new').length}
          </p>
          <p className="text-[#60a5fa] text-xs mt-1">This month</p>
        </div>
      </div>

      {/* RFM Analysis */}
      <div className="bg-[#161824] border border-[#232636] rounded-lg p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
        <h3 className="text-sm sm:text-base font-semibold text-[#f7f8f8] mb-4">Customer Segmentation (RFM Analysis)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { score: 'vip', label: 'VIP Customers', desc: 'High value, recent purchasers', color: 'border-[#5e6ad2]/30 bg-[#5e6ad2]/10 text-[#a5b4fc]' },
            { score: 'loyal', label: 'Loyal Customers', desc: 'Regular purchasers', color: 'border-[#10b981]/30 bg-[#10b981]/10 text-[#34d399]' },
            { score: 'at-risk', label: 'At Risk', desc: 'Declining engagement', color: 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24]' },
            { score: 'lost', label: 'Lost', desc: 'No recent activity', color: 'border-[#ef4444]/30 bg-[#ef4444]/10 text-[#f87171]' },
            { score: 'new', label: 'New', desc: 'Recent first-time buyers', color: 'border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#60a5fa]' }
          ].map((segment) => {
            const count = customers.filter(c => c.rfm.score === segment.score).length;
            const percentage = ((count / customers.length) * 100).toFixed(1);

            return (
              <div key={segment.score} className={`rounded-lg p-3 sm:p-4 border ${segment.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getSegmentIcon(segment.score)}
                  <h4 className="font-medium text-xs sm:text-sm text-[#f7f8f8]">{segment.label}</h4>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8]">{count}</p>
                <p className="text-xs text-[#8a8f98]">{percentage}% of total</p>
                <p className="text-[11px] text-[#62666d] mt-1">{segment.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-[#161824] border border-[#232636] rounded-lg p-3 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8a8f98]" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-9 pr-3 py-2 bg-[#10121b] border border-[#232636] text-[#f7f8f8] placeholder-[#62666d] rounded-md focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] text-xs sm:text-sm"
            />
          </div>

          <Select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="px-3 py-2 bg-[#10121b] border border-[#232636] text-[#f7f8f8] rounded-md focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] text-xs sm:text-sm"
          >
            <option value="all">All Segments</option>
            <option value="vip">VIP</option>
            <option value="loyal">Loyal</option>
            <option value="at-risk">At Risk</option>
            <option value="lost">Lost</option>
            <option value="new">New</option>
          </Select>

          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-[#10121b] border border-[#232636] text-[#f7f8f8] rounded-md focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] text-xs sm:text-sm"
          >
            <option value="all">All Status</option>
            <option value="vip">VIP Only</option>
            <option value="active">Active (90 days)</option>
            <option value="inactive">Inactive (90+ days)</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-[#10121b] border border-[#232636] text-[#f7f8f8] rounded-md focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] text-xs sm:text-sm"
          >
            <option value="name">Sort by Name</option>
            <option value="orders">Sort by Orders</option>
            <option value="spent">Sort by Total Spent</option>
            <option value="recency">Sort by Last Order</option>
            <option value="rfm">Sort by RFM Score</option>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#5e6ad2]/20 text-[#a5b4fc] border border-[#5e6ad2]/40' : 'bg-[#10121b] border border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8]'}`}
            >
              <div className="grid grid-cols-2 gap-1">
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
              </div>
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#5e6ad2]/20 text-[#a5b4fc] border border-[#5e6ad2]/40' : 'bg-[#10121b] border border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8]'}`}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCustomers.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-[#1b1e2c]">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm text-[#8a8f98]">
                {selectedCustomers.length} customers selected
              </span>
              <Button
                onClick={handleSelectAll}
                className="text-xs sm:text-sm text-[#5e6ad2] hover:text-[#828fff]"
              >
                {selectedCustomers.length === filteredCustomers.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleBulkEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5e6ad2] text-white rounded-md hover:bg-[#6d78d5] text-xs font-medium"
              >
                <Mail className="h-3.5 w-3.5" />
                Send Email
              </Button>
              <Button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981] text-white rounded-md hover:bg-[#059669] text-xs font-medium">
                <Tag className="h-3.5 w-3.5" />
                Add Tags
              </Button>
              <Button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8b5cf6] text-white rounded-md hover:bg-[#7c3aed] text-xs font-medium">
                <Gift className="h-3.5 w-3.5" />
                Send Coupon
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Customers Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
        {filteredCustomers.map((customer) => {
          const isSelected = selectedCustomers.includes(customer.id);
          const rfmScore = calculateRFMScore(customer);

          return viewMode === 'grid' ? (
            <div key={customer.id} className="bg-[#161824] border border-[#232636] rounded-lg p-4 hover:border-[#5e6ad2]/40 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectCustomer(customer.id)}
                    className="w-4 h-4 accent-[#5e6ad2] bg-[#10121b] border-[#232636] rounded"
                  />
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#232636] rounded-full flex items-center justify-center flex-shrink-0 text-[#f7f8f8]">
                    {customer.avatar ? (
                      <img src={customer.avatar} alt={customer.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xs sm:text-sm font-semibold">{customer.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-xs sm:text-sm text-[#f7f8f8] flex items-center gap-1.5 truncate">
                      {customer.name}
                      {customer.isVip && <Crown className="h-3.5 w-3.5 text-[#eab308] flex-shrink-0" />}
                    </h3>
                    <p className="text-xs text-[#8a8f98] truncate">{customer.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#8a8f98]">Segment:</span>
                  <span className={`px-2 py-0.5 text-[11px] rounded-full border ${getSegmentColor(customer.rfm.score)}`}>
                    {customer.rfm.score.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8a8f98]">RFM Score:</span>
                  <span className="font-medium text-[#f7f8f8]">{rfmScore}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8a8f98]">Orders:</span>
                  <span className="font-medium text-[#f7f8f8]">{customer.stats.totalOrders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8a8f98]">Total Spent:</span>
                  <span className="font-medium text-[#f7f8f8]">{formatCurrency(customer.stats.totalSpent)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8a8f98]">Last Order:</span>
                  <span className="font-medium text-[#f7f8f8]">{formatRelativeTime(customer.stats.lastOrderDate)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1b1e2c]">
                <div className="flex items-center gap-1">
                  {customer.preferences.email && (
                    <Button
                      onClick={() => sendNotification(customer.id, 'email')}
                      className="p-1.5 text-[#5e6ad2] hover:text-[#828fff] hover:bg-[#5e6ad2]/10 rounded"
                      title="Send Email"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {customer.preferences.sms && (
                    <Button
                      onClick={() => sendNotification(customer.id, 'sms')}
                      className="p-1.5 text-[#10b981] hover:text-[#34d399] hover:bg-[#10b981]/10 rounded"
                      title="Send SMS"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    onClick={() => sendNotification(customer.id, 'push')}
                    className="p-1.5 text-[#a5b4fc] hover:text-white hover:bg-[#5e6ad2]/10 rounded"
                    title="Send Push"
                  >
                    <Bell className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerDetails(true);
                    }}
                    className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#1b1e2c] rounded"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#1b1e2c] rounded">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div key={customer.id} className="bg-[#161824] border border-[#232636] rounded-lg p-3 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <Input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectCustomer(customer.id)}
                    className="w-4 h-4 accent-[#5e6ad2] bg-[#10121b] border-[#232636] rounded"
                  />
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#232636] rounded-full flex items-center justify-center flex-shrink-0 text-[#f7f8f8]">
                    {customer.avatar ? (
                      <img src={customer.avatar} alt={customer.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xs sm:text-sm font-semibold">{customer.name.charAt(0)}</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="font-medium text-xs sm:text-sm text-[#f7f8f8] flex items-center gap-1.5">
                      {customer.name}
                      {customer.isVip && <Crown className="h-3.5 w-3.5 text-[#eab308]" />}
                    </h3>
                    <span className={`px-2 py-0.5 text-[11px] rounded-full border ${getSegmentColor(customer.rfm.score)}`}>
                      {customer.rfm.score.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                    <div>
                      <span className="text-[#8a8f98]">Email:</span>
                      <span className="ml-1 text-[#f7f8f8] truncate block">{customer.email}</span>
                    </div>
                    <div>
                      <span className="text-[#8a8f98]">Phone:</span>
                      <span className="ml-1 text-[#f7f8f8]">{customer.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[#8a8f98]">Orders:</span>
                      <span className="ml-1 text-[#f7f8f8] font-medium">{customer.stats.totalOrders}</span>
                    </div>
                    <div>
                      <span className="text-[#8a8f98]">Spent:</span>
                      <span className="ml-1 text-[#f7f8f8] font-medium">{formatCurrency(customer.stats.totalSpent)}</span>
                    </div>
                    <div>
                      <span className="text-[#8a8f98]">RFM:</span>
                      <span className="ml-1 text-[#f7f8f8] font-medium">{rfmScore}</span>
                    </div>
                    <div>
                      <span className="text-[#8a8f98]">Last Order:</span>
                      <span className="ml-1 text-[#f7f8f8]">{formatRelativeTime(customer.stats.lastOrderDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 self-end sm:self-center pt-2 sm:pt-0 border-t border-[#1b1e2c] sm:border-0 w-full sm:w-auto justify-end">
                  {customer.preferences.email && (
                    <Button
                      onClick={() => sendNotification(customer.id, 'email')}
                      className="p-1.5 text-[#5e6ad2] hover:text-[#828fff] hover:bg-[#5e6ad2]/10 rounded"
                      title="Send Email"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {customer.preferences.sms && (
                    <Button
                      onClick={() => sendNotification(customer.id, 'sms')}
                      className="p-1.5 text-[#10b981] hover:text-[#34d399] hover:bg-[#10b981]/10 rounded"
                      title="Send SMS"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerDetails(true);
                    }}
                    className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#1b1e2c] rounded"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#1b1e2c] rounded">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 bg-[#161824] border border-[#232636] rounded-lg">
          <Users className="h-10 w-10 text-[#62666d] mx-auto mb-3" />
          <h3 className="text-sm font-medium text-[#f7f8f8] mb-1">No customers found</h3>
          <p className="text-xs text-[#8a8f98]">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer ? (
        <Modal
          open={showCustomerDetails}
          onClose={() => setShowCustomerDetails(false)}
          title={selectedCustomer.name}
          description={selectedCustomer.email}
          size="xl"
        >
            <div className="p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Customer Info */}
                <div className="bg-[#10121b] border border-[#232636] rounded-lg p-4">
                  <h4 className="font-medium text-xs sm:text-sm text-[#f7f8f8] mb-3">Customer Information</h4>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <p><span className="text-[#8a8f98]">Phone:</span> <span className="text-[#f7f8f8]">{selectedCustomer.phone || 'Not provided'}</span></p>
                    <p><span className="text-[#8a8f98]">Date of Birth:</span> <span className="text-[#f7f8f8]">{selectedCustomer.dateOfBirth || 'Not provided'}</span></p>
                    <p><span className="text-[#8a8f98]">Gender:</span> <span className="text-[#f7f8f8]">{selectedCustomer.gender || 'Not specified'}</span></p>
                    <p><span className="text-[#8a8f98]">Member Since:</span> <span className="text-[#f7f8f8]">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</span></p>
                    <p><span className="text-[#8a8f98]">VIP Status:</span> <span className="text-[#f7f8f8] font-medium">{selectedCustomer.isVip ? 'Yes' : 'No'}</span></p>
                  </div>
                </div>

                {/* Statistics */}
                <div className="bg-[#10121b] border border-[#232636] rounded-lg p-4">
                  <h4 className="font-medium text-xs sm:text-sm text-[#f7f8f8] mb-3">Order Statistics</h4>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <p><span className="text-[#8a8f98]">Total Orders:</span> <span className="text-[#f7f8f8] font-medium">{selectedCustomer.stats.totalOrders}</span></p>
                    <p><span className="text-[#8a8f98]">Total Spent:</span> <span className="text-[#f7f8f8] font-medium">{formatCurrency(selectedCustomer.stats.totalSpent)}</span></p>
                    <p><span className="text-[#8a8f98]">Average Order Value:</span> <span className="text-[#f7f8f8]">{formatCurrency(selectedCustomer.stats.avgOrderValue)}</span></p>
                    <p><span className="text-[#8a8f98]">Items Purchased:</span> <span className="text-[#f7f8f8]">{selectedCustomer.stats.itemsPurchased}</span></p>
                    <p><span className="text-[#8a8f98]">First Order:</span> <span className="text-[#f7f8f8]">{new Date(selectedCustomer.stats.firstOrderDate).toLocaleDateString()}</span></p>
                    <p><span className="text-[#8a8f98]">Last Order:</span> <span className="text-[#f7f8f8]">{new Date(selectedCustomer.stats.lastOrderDate).toLocaleDateString()}</span></p>
                  </div>
                </div>
              </div>

              {/* RFM Analysis */}
              <div className="bg-[#10121b] border border-[#232636] rounded-lg p-4">
                <h4 className="font-medium text-xs sm:text-sm text-[#f7f8f8] mb-3">RFM Analysis</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-[#8a8f98]">Recency</p>
                    <p className="text-base sm:text-lg font-bold text-[#f7f8f8]">{selectedCustomer.rfm.recency}</p>
                    <p className="text-[11px] text-[#62666d]">How recent</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8a8f98]">Frequency</p>
                    <p className="text-base sm:text-lg font-bold text-[#f7f8f8]">{selectedCustomer.rfm.frequency}</p>
                    <p className="text-[11px] text-[#62666d]">How often</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8a8f98]">Monetary</p>
                    <p className="text-base sm:text-lg font-bold text-[#f7f8f8]">{selectedCustomer.rfm.monetary}</p>
                    <p className="text-[11px] text-[#62666d]">How much</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#1b1e2c]">
                  <p className="text-xs sm:text-sm text-[#8a8f98]">Segment: <span className="font-medium text-[#f7f8f8]">{selectedCustomer.rfm.segment}</span></p>
                </div>
              </div>

              {/* Addresses */}
              <div>
                <h4 className="font-medium text-xs sm:text-sm text-[#f7f8f8] mb-3">Addresses</h4>
                <div className="space-y-3">
                  {selectedCustomer.addresses.map((address) => (
                    <div key={address.id} className="bg-[#10121b] border border-[#232636] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-xs sm:text-sm text-[#f7f8f8]">{address.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 text-[11px] rounded-full border ${
                            address.type === 'shipping' ? 'bg-[#5e6ad2]/20 text-[#a5b4fc] border-[#5e6ad2]/30' : 'bg-[#10b981]/20 text-[#34d399] border-[#10b981]/30'
                          }`}>
                            {address.type}
                          </span>
                          {address.isDefault && <span className="px-2 py-0.5 text-[11px] rounded-full bg-[#eab308]/20 text-[#fbbf24] border border-[#eab308]/30">Default</span>}
                        </div>
                      </div>
                      <p className="text-xs text-[#8a8f98]">
                        {address.street}<br />
                        {address.city}, {address.state} {address.zip}<br />
                        {address.country}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-[#10121b] border border-[#232636] rounded-lg p-4">
                <h4 className="font-medium text-xs sm:text-sm text-[#f7f8f8] mb-3">Communication Preferences</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="checkbox"
                      checked={selectedCustomer.preferences.email}
                      readOnly
                      className="w-4 h-4 accent-[#5e6ad2] rounded"
                    />
                    <span className="text-xs sm:text-sm text-[#f7f8f8]">Email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="checkbox"
                      checked={selectedCustomer.preferences.sms}
                      readOnly
                      className="w-4 h-4 accent-[#5e6ad2] rounded"
                    />
                    <span className="text-xs sm:text-sm text-[#f7f8f8]">SMS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="checkbox"
                      checked={selectedCustomer.preferences.marketing}
                      readOnly
                      className="w-4 h-4 accent-[#5e6ad2] rounded"
                    />
                    <span className="text-xs sm:text-sm text-[#f7f8f8]">Marketing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-[#8a8f98]">Language:</span>
                    <span className="text-xs sm:text-sm font-medium text-[#f7f8f8]">{selectedCustomer.preferences.language}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedCustomer.notes && (
                <div className="bg-[#eab308]/10 border border-[#eab308]/20 rounded-lg p-4">
                  <h4 className="font-medium text-xs sm:text-sm text-[#fbbf24] mb-1">Notes</h4>
                  <p className="text-xs sm:text-sm text-[#eab308]">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#5e6ad2] text-white rounded-md hover:bg-[#6d78d5] text-xs sm:text-sm font-medium">
                  <Mail className="h-4 w-4" />
                  Send Email
                </Button>
                {selectedCustomer.phone && (
                  <Button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#10b981] text-white rounded-md hover:bg-[#059669] text-xs sm:text-sm font-medium">
                    <Phone className="h-4 w-4" />
                    Send SMS
                  </Button>
                )}
                <Button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#8b5cf6] text-white rounded-md hover:bg-[#7c3aed] text-xs sm:text-sm font-medium">
                  <Gift className="h-4 w-4" />
                  Send Coupon
                </Button>
                <Button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f97316] text-white rounded-md hover:bg-[#ea580c] text-xs sm:text-sm font-medium">
                  <Tag className="h-4 w-4" />
                  Add Tag
                </Button>
                {selectedCustomer.isVip ? (
                  <Button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#ef4444] text-white rounded-md hover:bg-[#dc2626] text-xs sm:text-sm font-medium">
                    <Crown className="h-4 w-4" />
                    Remove VIP
                  </Button>
                ) : (
                  <Button className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-md text-xs sm:text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                    <Crown className="h-4 w-4" />
                    Make VIP
                  </Button>
                )}
              </div>
            </div>
        </Modal>
      ) : null}

      {/* Segment Manager Modal */}
      <Modal
        open={showSegmentManager}
        onClose={() => setShowSegmentManager(false)}
        title="Customer Segments"
        size="lg"
      >
            <div className="p-4 sm:p-6 space-y-4">
              <p className="text-xs sm:text-sm text-[#8a8f98]">Manage your customer segmentation rules and targeting strategies.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {[
                  { name: 'VIP Customers', desc: 'High-value customers with 90+ RFM score', count: customers.filter(c => c.rfm.score === 'vip').length },
                  { name: 'Loyal Customers', desc: 'Regular purchasers with good engagement', count: customers.filter(c => c.rfm.score === 'loyal').length },
                  { name: 'At Risk Customers', desc: 'Declining engagement, needs re-engagement', count: customers.filter(c => c.rfm.score === 'at-risk').length },
                  { name: 'Lost Customers', desc: 'No purchases in 6+ months', count: customers.filter(c => c.rfm.score === 'lost').length },
                ].map((segment, index) => (
                  <div key={index} className="bg-[#10121b] border border-[#232636] rounded-lg p-4">
                    <h4 className="font-medium text-xs sm:text-sm text-[#f7f8f8] mb-1">{segment.name}</h4>
                    <p className="text-xs text-[#8a8f98] mb-2">{segment.desc}</p>
                    <p className="text-base sm:text-lg font-bold text-[#5e6ad2]">{segment.count} customers</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button className="flex-1 px-4 py-2 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white rounded-md text-xs sm:text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all">
                  Create Campaign
                </Button>
                <Button
                  onClick={() => setShowSegmentManager(false)}
                  className="flex-1 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-[#232636] text-[#f7f8f8] rounded-md text-xs sm:text-sm font-medium transition-colors"
                >
                  Close
                </Button>
              </div>
            </div>
      </Modal>

      {/* VIP Manager Modal */}
      <Modal
        open={showVipManager}
        onClose={() => setShowVipManager(false)}
        title="VIP Customer Management"
        size="lg"
      >
            <div className="p-4 sm:p-6 space-y-4">
              <p className="text-xs sm:text-sm text-[#8a8f98]">Manage your VIP customers and exclusive benefits.</p>

              <div className="bg-[#10121b] border border-[#232636] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-xs sm:text-sm text-[#f7f8f8]">Current VIP Customers</h4>
                  <span className="text-[#eab308] font-bold text-base sm:text-lg">{customers.filter(c => c.isVip).length}</span>
                </div>
                <p className="text-xs text-[#8a8f98]">These customers receive exclusive benefits and priority support.</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-xs sm:text-sm text-[#f7f8f8]">VIP Benefits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Free shipping on all orders',
                    'Early access to new products',
                    'Exclusive discounts and promotions',
                    'Priority customer support',
                    'Birthday gifts and rewards',
                    'Invitations to VIP events'
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs sm:text-sm text-[#8a8f98] bg-[#10121b] border border-[#232636] p-2.5 rounded-md">
                      <CheckCircle className="h-4 w-4 text-[#10b981] flex-shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button className="flex-1 px-4 py-2 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white rounded-md text-xs sm:text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all">
                  Manage VIP Rules
                </Button>
                <Button
                  onClick={() => setShowVipManager(false)}
                  className="flex-1 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-[#232636] text-[#f7f8f8] rounded-md text-xs sm:text-sm font-medium transition-colors"
                >
                  Close
                </Button>
              </div>
            </div>
      </Modal>
    </div>
  );
}
