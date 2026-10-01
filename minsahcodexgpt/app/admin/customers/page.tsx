'use client';





import { useToast } from '@/components/ui/ToastProvider';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import {
  Search,
  Filter,
  Mail,
  Phone,
  Eye,
  Edit,
  Trash2,
  FileText,
  UserPlus,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatPrice, convertUSDtoBDT } from '@/utils/currency';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  joinDate: string;
  lastLogin?: string;
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  role: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  loyaltyPoints: number;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  } | null;
  marketing: {
    emailConsent: boolean;
    smsConsent: boolean;
  };
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface Stats {
  totalCustomers: number;
  activeCustomers: number;
  suspendedCustomers: number;
  totalOrders: number;
  totalRevenue: number;
}

interface CustomerFilters {
  search: string;
  status: string;
  sortBy: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { hasPermission } = useAdminAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, totalCount: 0, totalPages: 1,
  });
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0, activeCustomers: 0, suspendedCustomers: 0,
    totalOrders: 0, totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    status: '',
    sortBy: 'createdAt',
  });

  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active',
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setEditForm({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      status: c.status || 'active',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setSavingCustomer(true);
    try {
      const res = await fetch(`/api/admin/customers/${editingCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update customer');
      }
      pushToast({ tone: 'success', description: 'Customer updated successfully' });
      setEditingCustomer(null);
      fetchCustomers(pagination.page);
    } catch (err: any) {
      pushToast({ tone: 'danger', description: err?.message || 'Failed to update customer' });
    } finally {
      setSavingCustomer(false);
    }
  };

  // Delete Customer State & Handler
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    const target = deletingCustomer;
    setDeletingLoading(true);
    // Optimistic removal
    setCustomers((prev) => prev.filter((c) => c.id !== target.id));
    try {
      const res = await fetch(`/api/admin/customers/${target.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete customer');
      }
      pushToast({ tone: 'success', description: 'Customer deleted successfully' });
      setDeletingCustomer(null);
    } catch (err: any) {
      pushToast({ tone: 'danger', description: err?.message || 'Failed to delete customer' });
      fetchCustomers(pagination.page);
    } finally {
      setDeletingLoading(false);
    }
  };

  // Add Customer State & Handler
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [addingCustomer, setAddingCustomer] = useState(false);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCustomer(true);
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add customer');
      }
      pushToast({ tone: 'success', description: 'Customer created successfully' });
      setAddModalOpen(false);
      setAddForm({ firstName: '', lastName: '', email: '', phone: '' });
      fetchCustomers(1);
    } catch (err: any) {
      pushToast({ tone: 'danger', description: err?.message || 'Failed to add customer' });
    } finally {
      setAddingCustomer(false);
    }
  };

  // ─── Fetch customers from API ───────────────────────────────────────────────
  const fetchCustomers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        sortBy: filters.sortBy,
        sortOrder: 'desc',
      });
      if (filters.search)  params.set('search', filters.search);
      if (filters.status)  params.set('status', filters.status);

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch customers');
      }
      const data = await res.json();
      setCustomers(data.customers);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchCustomers(1);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [fetchCustomers]);

  // ─── Status update ──────────────────────────────────────────────────────────
  const handleStatusUpdate = async (customerId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      // Optimistic UI update
      setCustomers(prev =>
        prev.map(c => c.id === customerId ? { ...c, status: newStatus as Customer['status'] } : c)
      );
    } catch (err) {
      pushToast({ tone: 'danger', description: 'Failed to update customer status. Please try again.' });
    }
  };

  const [bulkStatusTarget, setBulkStatusTarget] = useState<'suspended' | 'active' | null>(null);

  const handleConfirmBulkStatus = async () => {
    if (!bulkStatusTarget) return;
    const target = bulkStatusTarget;
    const ids = [...selectedCustomers];
    setBulkStatusTarget(null);
    setSelectedCustomers([]);
    for (const id of ids) {
      await handleStatusUpdate(id, target);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':    return 'bg-emerald-500/10 text-emerald-400';
      case 'inactive':  return 'bg-[#10121b] text-[#8a8f98]';
      case 'suspended': return 'bg-amber-500/10 text-amber-400';
      case 'banned':    return 'bg-red-100 text-rose-400';
      default:          return 'bg-[#10121b] text-[#8a8f98]';
    }
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#f7f8f8]">Customers</h1>
          <p className="text-xs sm:text-sm text-[#8a8f98] mt-1">
            {pagination.totalCount} total customers
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            onClick={() => fetchCustomers(pagination.page)}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#232636] bg-[#161824] text-[#f7f8f8] rounded-md text-xs sm:text-sm hover:bg-[#1b1e2c] transition"
          >
            <RefreshCw size={14} className="text-[#8a8f98]" />
            Refresh
          </Button>
          {hasPermission(PERMISSIONS.CUSTOMERS_EDIT) && (
            <Button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#5e6ad2] text-white hover:bg-[#6d78d5] rounded-md text-xs sm:text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] transition"
            >
              <UserPlus size={15} />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#161824] rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] border border-[#232636]">
          <p className="text-xs text-[#8a8f98] font-medium">Total Customers</p>
          <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8] mt-1">{stats.totalCustomers.toLocaleString()}</p>
        </div>
        <div className="bg-[#161824] rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] border border-[#232636]">
          <p className="text-xs text-[#8a8f98] font-medium">Active</p>
          <p className="text-xl sm:text-2xl font-bold text-[#34d399] mt-1">{stats.activeCustomers.toLocaleString()}</p>
        </div>
        <div className="bg-[#161824] rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] border border-[#232636]">
          <p className="text-xs text-[#8a8f98] font-medium">Suspended</p>
          <p className="text-xl sm:text-2xl font-bold text-[#fbbf24] mt-1">{stats.suspendedCustomers.toLocaleString()}</p>
        </div>
        <div className="bg-[#161824] rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] border border-[#232636]">
          <p className="text-xs text-[#8a8f98] font-medium">Total Revenue</p>
          <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8] mt-1">
            {formatPrice(convertUSDtoBDT(stats.totalRevenue))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#161824] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] border border-[#232636] p-3 sm:p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[180px] relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8f98]" />
            <Input
              type="text"
              placeholder="Search by name, email, phone..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-[#232636] bg-[#10121b] text-[#f7f8f8] placeholder-[#62666d] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
            />
          </div>

          <Select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-[#232636] bg-[#10121b] text-[#f7f8f8] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </Select>

          <Select
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            className="px-3 py-2 border border-[#232636] bg-[#10121b] text-[#f7f8f8] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
          >
            <option value="createdAt">Join Date</option>
            <option value="lastLoginAt">Last Login</option>
            <option value="loyaltyPoints">Loyalty Points</option>
            <option value="email">Email</option>
            <option value="totalOrders">Total Orders</option>
            <option value="totalSpent">Total Spent</option>
          </Select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/70 border border-red-800/40 text-white/60 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Bulk actions */}
      {selectedCustomers.length > 0 && hasPermission(PERMISSIONS.CUSTOMERS_EDIT) && (
        <div className="bg-[#10121b] border border-[#232636] rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-[#f7f8f8]">
            {selectedCustomers.length} customer(s) selected
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() => setBulkStatusTarget('suspended')}
              className="px-4 py-1.5 text-xs bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/30 rounded-md hover:bg-[#f59e0b]/25 transition"
            >
              Suspend Selected
            </Button>
            <Button
              onClick={() => setBulkStatusTarget('active')}
              className="px-4 py-1.5 text-xs bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30 rounded-md hover:bg-[#10b981]/25 transition"
            >
              Activate Selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#161824] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] border border-[#232636] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#5e6ad2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20 text-[#8a8f98]">
            <p className="text-base font-medium text-[#f7f8f8]">No customers found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="table-responsive overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-[#10121b] border-b border-[#232636]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <Input
                      type="checkbox"
                      checked={selectedCustomers.length === customers.length && customers.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 accent-[#5e6ad2] rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[#8a8f98]">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8a8f98]">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8a8f98]">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-[#8a8f98]">Orders</th>
                  <th className="px-4 py-3 text-right font-medium text-[#8a8f98]">Total Spent</th>
                  <th className="px-4 py-3 text-right font-medium text-[#8a8f98]">Points</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8a8f98]">Joined</th>
                  <th className="px-4 py-3 text-center font-medium text-[#8a8f98]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1e2c] bg-[#161824]">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-[#1b1e2c] transition-colors">
                    <td className="px-4 py-3">
                      <Input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => handleSelectCustomer(customer.id)}
                        className="w-4 h-4 accent-[#5e6ad2] rounded"
                      />
                    </td>

                    {/* Customer Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#232636] border border-[#232636] flex items-center justify-center text-[#f7f8f8] font-bold text-xs flex-shrink-0">
                          {customer.avatar ? (
                            <img
                              src={customer.avatar}
                              alt={customer.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            customer.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[#f7f8f8]">{customer.name}</p>
                          {customer.address?.city && (
                            <p className="text-xs text-[#8a8f98]">
                              {customer.address.city}, {customer.address.country}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[#8a8f98]">
                          <Mail size={12} />
                          <span className="text-xs truncate max-w-[160px] text-[#f7f8f8]">{customer.email}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-[#8a8f98]">
                            <Phone size={12} />
                            <span className="text-xs">{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {hasPermission(PERMISSIONS.CUSTOMERS_EDIT) ? (
                        <Select
                          value={customer.status}
                          onChange={(e) => handleStatusUpdate(customer.id, e.target.value)}
                          className={clsx(
                            'text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer focus:outline-none bg-[#10121b]',
                            customer.status === 'active' && 'text-[#34d399]',
                            customer.status === 'suspended' && 'text-[#fbbf24]',
                            customer.status === 'banned' && 'text-[#f87171]',
                            customer.status === 'inactive' && 'text-[#8a8f98]'
                          )}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                          <option value="banned">Banned</option>
                        </Select>
                      ) : (
                        <span className={clsx(
                          'text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                          customer.status === 'active' && 'bg-[#10b981]/15 text-[#34d399]',
                          customer.status === 'suspended' && 'bg-[#f59e0b]/15 text-[#fbbf24]',
                          customer.status === 'banned' && 'bg-[#ef4444]/15 text-[#f87171]',
                          customer.status === 'inactive' && 'bg-[#232636] text-[#8a8f98]'
                        )}>
                          {customer.status}
                        </span>
                      )}
                    </td>

                    {/* Orders */}
                    <td className="px-4 py-3 text-right font-medium text-[#f7f8f8]">
                      {customer.totalOrders}
                    </td>

                    {/* Total Spent */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-[#f7f8f8]">
                        {formatPrice(convertUSDtoBDT(customer.totalSpent))}
                      </span>
                    </td>

                    {/* Loyalty Points */}
                    <td className="px-4 py-3 text-right text-[#8a8f98] text-xs">
                      {customer.loyaltyPoints.toLocaleString()} pts
                    </td>

                    {/* Join Date */}
                    <td className="px-4 py-3 text-xs text-[#8a8f98]">
                      {new Date(customer.joinDate).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          onClick={() => router.push(`/admin/orders?search=${encodeURIComponent(customer.email)}`)}
                          className="p-1.5 hover:bg-[#10121b] border border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8] rounded-md transition"
                          title="View Profile"
                        >
                          <Eye size={14} />
                        </Button>
                        {hasPermission(PERMISSIONS.CUSTOMERS_EDIT) && (
                          <Button
                            onClick={() => handleOpenEdit(customer)}
                            className="p-1.5 hover:bg-[#10121b] border border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8] rounded-md transition"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </Button>
                        )}
                        <Button
                          onClick={() => router.push(`/admin/orders?search=${encodeURIComponent(customer.email)}`)}
                          className="p-1.5 hover:bg-[#10121b] border border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8] rounded-md transition"
                          title="Orders"
                        >
                          <FileText size={14} />
                        </Button>
                        {hasPermission(PERMISSIONS.CUSTOMERS_DELETE) && (
                          <Button
                            onClick={() => setDeletingCustomer(customer)}
                            className="p-1.5 hover:bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#f87171] rounded-md transition"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <p className="text-xs sm:text-sm text-[#8a8f98]">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} customers
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              onClick={() => fetchCustomers(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-4 py-1.5 text-xs border border-[#232636] bg-[#161824] text-[#f7f8f8] rounded-md disabled:opacity-40 hover:bg-[#1b1e2c] transition"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const p = Math.max(1, pagination.page - 2) + i;
              if (p > pagination.totalPages) return null;
              return (
                <Button
                  key={p}
                  onClick={() => fetchCustomers(p)}
                  className={clsx(
                    'px-3.5 py-1.5 text-xs rounded-md transition min-w-[32px] justify-center',
                    p === pagination.page
                      ? 'bg-[#5e6ad2] text-white'
                      : 'border border-[#232636] bg-[#161824] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#1b1e2c]'
                  )}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              onClick={() => fetchCustomers(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-1.5 text-xs border border-[#232636] bg-[#161824] text-[#f7f8f8] rounded-md disabled:opacity-40 hover:bg-[#1b1e2c] transition"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#161824] border border-[#232636] rounded-xl p-6 shadow-2xl text-left">
            <h3 className="text-base font-semibold text-[#f7f8f8] mb-4">
              Edit Customer: {editingCustomer.name}
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">Full Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Customer Name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">Email Address</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="customer@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">Phone Number</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+8801..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">Status</label>
                <Select
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </Select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 text-xs bg-[#10121b] border border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8] rounded-md transition"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingCustomer}
                  className="px-4 py-2 text-xs bg-[#5e6ad2] hover:bg-[#5e6ad2]/80 text-white rounded-md transition font-medium"
                >
                  {savingCustomer ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingCustomer)}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Customer"
        description={`Are you sure you want to delete "${deletingCustomer?.name || deletingCustomer?.email}"? If this customer has order history, they will be archived/banned instead of completely erased.`}
        confirmLabel={deletingLoading ? "Deleting..." : "Delete Customer"}
        tone="danger"
        loading={deletingLoading}
      />

      {/* Add Customer Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#161824] border border-[#232636] rounded-xl p-6 shadow-2xl text-left">
            <h3 className="text-base font-semibold text-[#f7f8f8] mb-4">
              Add New Customer
            </h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8a8f98] mb-1">First Name</label>
                  <Input
                    value={addForm.firstName}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8a8f98] mb-1">Last Name</label>
                  <Input
                    value={addForm.lastName}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">Email Address *</label>
                <Input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="customer@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">Phone Number</label>
                <Input
                  value={addForm.phone}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+8801..."
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs bg-[#10121b] border border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8] rounded-md transition"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addingCustomer}
                  className="px-4 py-2 text-xs bg-[#5e6ad2] hover:bg-[#5e6ad2]/80 text-white rounded-md transition font-medium"
                >
                  {addingCustomer ? 'Adding...' : 'Add Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Status Update Confirmation */}
      <ConfirmDialog
        open={Boolean(bulkStatusTarget)}
        onClose={() => setBulkStatusTarget(null)}
        onConfirm={handleConfirmBulkStatus}
        title={`${bulkStatusTarget === 'suspended' ? 'Suspend' : 'Activate'} Customers`}
        description={`You are about to ${bulkStatusTarget === 'suspended' ? 'suspend' : 'activate'} ${selectedCustomers.length} customers. This cannot be undone immediately. Continue?`}
        confirmLabel={bulkStatusTarget === 'suspended' ? 'Suspend Selected' : 'Activate Selected'}
        tone={bulkStatusTarget === 'suspended' ? 'danger' : 'primary'}
      />
    </div>
  );
}
