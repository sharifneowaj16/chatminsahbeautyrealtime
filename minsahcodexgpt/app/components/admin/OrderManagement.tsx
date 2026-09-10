'use client';





import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useState, useEffect } from 'react';
import type { AdminOrder } from '@/types/admin';
import {
  Search,
  Plus,
  Filter,
  Printer,
  Truck,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  RefreshCw,
  Eye,
  Edit,
  Archive,
  Receipt
} from 'lucide-react';

export default function OrderManagement() {
  const { requestConfirmation } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [dateRange, setDateRange] = useState('30days');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, selectedStatus, selectedPaymentStatus, dateRange]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockOrders = generateMockOrders();
      setOrders(mockOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    // Filter by payment status
    if (selectedPaymentStatus !== 'all') {
      filtered = filtered.filter(order => order.paymentStatus === selectedPaymentStatus);
    }

    // Filter by date range
    const now = new Date();
    const filterDate = new Date();
    switch (dateRange) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        filterDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        filterDate.setDate(now.getDate() - 90);
        break;
    }

    if (dateRange !== 'all') {
      filtered = filtered.filter(order => new Date(order.createdAt) >= filterDate);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredOrders(filtered);
  };

  const generateMockOrders = (): AdminOrder[] => {
    const statuses: AdminOrder['status'][] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const paymentStatuses: AdminOrder['paymentStatus'][] = ['pending', 'paid', 'failed', 'refunded'];

    return Array.from({ length: 50 }, (_, i) => {
      const orderNumber = `ORD-${String(i + 1).padStart(5, '0')}`;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

      return {
        id: `order-${i + 1}`,
        orderNumber,
        customer: {
          id: `customer-${Math.floor(Math.random() * 20) + 1}`,
          name: [
            'Sarah Johnson',
            'Emily Chen',
            'Maria Garcia',
            'Jessica Smith',
            'Ashley Wilson',
            'Amanda Brown',
            'Jennifer Davis',
            'Lisa Anderson'
          ][Math.floor(Math.random() * 8)],
          email: `customer${i + 1}@example.com`,
          phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        },
        status,
        paymentStatus,
        shippingAddress: {
          name: 'Home',
          street: `${123 + i} Main St`,
          city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][i % 5],
          state: ['NY', 'CA', 'IL', 'TX', 'AZ'][i % 5],
          zip: String(10000 + i),
          country: 'US',
          phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        },
        billingAddress: {
          name: 'Home',
          street: `${123 + i} Main St`,
          city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][i % 5],
          state: ['NY', 'CA', 'IL', 'TX', 'AZ'][i % 5],
          zip: String(10000 + i),
          country: 'US',
        },
        items: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
          id: `item-${i}-${j}`,
          productId: `P-${String(j + 1).padStart(3, '0')}`,
          name: [
            'Luxury Face Serum',
            'Hydrating Face Cream',
            'Anti-Aging Eye Cream',
            'Rose Face Oil',
            'Vitamin C Serum'
          ][j % 5],
          sku: `SKU-${String(j + 1).padStart(4, '0')}`,
          variant: `Size ${['30ml', '50ml', '100ml'][j % 3]}`,
          quantity: Math.floor(Math.random() * 2) + 1,
          price: Math.floor(Math.random() * 100) + 20,
          total: (Math.floor(Math.random() * 100) + 20) * (Math.floor(Math.random() * 2) + 1),
        })),
        pricing: {
          subtotal: Math.floor(Math.random() * 200) + 50,
          tax: Math.floor(Math.random() * 30) + 10,
          shipping: Math.floor(Math.random() * 15) + 5,
          discount: Math.floor(Math.random() * 20),
          total: Math.floor(Math.random() * 250) + 80,
          currency: 'USD',
        },
        shipping: {
          method: ['Standard Shipping', 'Express Shipping', 'Overnight'][Math.floor(Math.random() * 3)],
          tracking: status === 'shipped' || status === 'delivered' ? `TRK-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}` : undefined,
          carrier: ['UPS', 'FedEx', 'USPS'][Math.floor(Math.random() * 3)],
          cost: Math.floor(Math.random() * 15) + 5,
          estimatedDelivery: status === 'shipped' ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
        },
        payment: {
          method: ['Credit Card', 'PayPal', 'Apple Pay', 'Google Pay'][Math.floor(Math.random() * 4)],
          transactionId: paymentStatus === 'paid' ? `TXN-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}` : undefined,
          gateway: ['Stripe', 'PayPal', 'Square'][Math.floor(Math.random() * 3)],
          paidAt: paymentStatus === 'paid' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        },
        notes: Math.random() > 0.7 ? 'Customer requested gift wrapping' : undefined,
        internalNotes: Math.random() > 0.8 ? 'VIP customer - expedite processing' : undefined,
        timeline: generateOrderTimeline(status),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    });
  };

  const generateOrderTimeline = (status: AdminOrder['status']) => {
    const now = new Date();
    const timeline = [
      {
        timestamp: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Order placed',
        note: 'Customer submitted order',
        actor: 'Customer',
      },
    ];

    if (status !== 'pending') {
      timeline.push({
        timestamp: new Date(now.getTime() - Math.random() * 25 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Order confirmed',
        note: 'Payment confirmed and order processed',
        actor: 'System',
      });
    }

    if (status === 'processing' || status === 'shipped' || status === 'delivered') {
      timeline.push({
        timestamp: new Date(now.getTime() - Math.random() * 20 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Processing',
        note: 'Order is being prepared for shipment',
        actor: 'Warehouse',
      });
    }

    if (status === 'shipped' || status === 'delivered') {
      timeline.push({
        timestamp: new Date(now.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Shipped',
        note: 'Order has been shipped',
        actor: 'Carrier',
      });
    }

    if (status === 'delivered') {
      timeline.push({
        timestamp: new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Delivered',
        note: 'Order delivered successfully',
        actor: 'Carrier',
      });
    }

    return timeline;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
      case 'confirmed': return 'bg-[#5e6ad2]/15 text-[#f7f8f8] border border-[#5e6ad2]/30';
      case 'processing': return 'bg-[#5e6ad2]/25 text-[#f7f8f8] border border-[#5e6ad2]/40';
      case 'shipped': return 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
      case 'delivered': return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      case 'cancelled': return 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
      case 'refunded': return 'bg-orange-500/15 text-orange-300 border border-orange-500/30';
      default: return 'bg-white/[0.05] text-[#8a8f98] border border-[#232636]';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
      case 'paid': return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      case 'failed': return 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
      case 'refunded': return 'bg-orange-500/15 text-orange-300 border border-orange-500/30';
      case 'partially_refunded': return 'bg-[#5e6ad2]/20 text-[#f7f8f8] border border-[#5e6ad2]/30';
      default: return 'bg-white/[0.05] text-[#8a8f98] border border-[#232636]';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const updateOrderStatus = async (orderId: string, newStatus: AdminOrder['status']) => {
    // Simulate API call
    setOrders(prev => prev.map(order =>
      order.id === orderId
        ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
        : order
    ));
  };

  const printInvoice = (_order: AdminOrder) => {
    // Simulate print functionality
    window.print();
  };

  const printShippingLabel = (_order: AdminOrder) => {
    // Simulate print functionality
    window.print();
  };

  const processRefund = async (order: AdminOrder) => {
    if (await requestConfirmation({ title: 'Process full refund?', description: `Order ${order.orderNumber} will be marked as refunded.`, confirmLabel: 'Process refund', tone: 'danger' })) {
      // Simulate API call
      setOrders(prev => prev.map(o =>
        o.id === order.id
          ? { ...o, status: 'refunded', paymentStatus: 'refunded', updatedAt: new Date().toISOString() }
          : o
      ));
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-white/[0.05] rounded w-64"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-[#161824] border border-[#232636] rounded-xl"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#161824] border border-[#232636] rounded-xl p-4">
                <div className="h-4 bg-white/[0.05] rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-white/[0.03] rounded w-1/2"></div>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#232636]">
        <div>
          <h1 className="text-[20px] font-semibold text-[#f7f8f8] tracking-tight">Order Management</h1>
          <p className="text-xs text-[#8a8f98] mt-0.5">Manage customer orders, shipping labels, and fulfillment</p>
        </div>

        <div className="flex items-center gap-2">
          <Button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-[#232636] hover:bg-white/[0.08] text-[#f7f8f8] rounded-md text-[13px] font-medium transition-all">
            <RefreshCw className="h-3.5 w-3.5 text-[#8a8f98]" />
            <span>Sync Orders</span>
          </Button>
          <Button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-[#232636] hover:bg-white/[0.08] text-[#f7f8f8] rounded-md text-[13px] font-medium transition-all">
            <Printer className="h-3.5 w-3.5 text-[#8a8f98]" />
            <span>Bulk Print</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="bg-[#161824] border border-[#232636] rounded-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#8a8f98]">Total Orders</span>
            <FileText className="h-4 w-4 text-[#8a8f98]" />
          </div>
          <p className="text-2xl font-semibold text-[#f7f8f8] tracking-tight">{orders.length}</p>
        </div>
        <div className="bg-[#161824] border border-[#232636] rounded-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#8a8f98]">Pending</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-semibold text-[#f7f8f8] tracking-tight">
            {orders.filter(o => o.status === 'pending').length}
          </p>
        </div>
        <div className="bg-[#161824] border border-[#232636] rounded-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#8a8f98]">Processing</span>
            <Filter className="h-4 w-4 text-[#5e6ad2]" />
          </div>
          <p className="text-2xl font-semibold text-[#f7f8f8] tracking-tight">
            {orders.filter(o => o.status === 'processing').length}
          </p>
        </div>
        <div className="bg-[#161824] border border-[#232636] rounded-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#8a8f98]">Shipped</span>
            <Truck className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl font-semibold text-[#f7f8f8] tracking-tight">
            {orders.filter(o => o.status === 'shipped').length}
          </p>
        </div>
        <div className="bg-[#161824] border border-[#232636] rounded-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#8a8f98]">Delivered</span>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-semibold text-[#f7f8f8] tracking-tight">
            {orders.filter(o => o.status === 'delivered').length}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#161824] border border-[#232636] rounded-xl p-3.5 shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-[#8a8f98]" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] placeholder-[#8a8f98]/50 focus:border-[#5e6ad2] rounded-md text-[13px]"
            />
          </div>

          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] rounded-md text-[13px] focus:border-[#5e6ad2]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </Select>

          <Select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] rounded-md text-[13px] focus:border-[#5e6ad2]"
          >
            <option value="all">All Payment Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially Refunded</option>
          </Select>

          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] rounded-md text-[13px] focus:border-[#5e6ad2]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </Select>

          <Button className="px-3 py-1.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white font-medium rounded-md text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center transition-all">
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#161824] border border-[#232636] rounded-xl overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
        <div className="table-responsive overflow-x-auto">
          <table className="min-w-full divide-y divide-[#1b1e2c]">
            <thead className="bg-[#10121b]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1e2c]">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="text-[13px] font-medium text-[#f7f8f8]">{order.orderNumber}</p>
                      <p className="text-xs text-[#8a8f98]">{order.items.length} items</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="text-[13px] font-medium text-[#f7f8f8]">{order.customer.name}</p>
                      <p className="text-xs text-[#8a8f98]">{order.customer.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="space-y-0.5">
                      {order.items.slice(0, 2).map((item, index) => (
                        <p key={index} className="text-xs text-[#8a8f98] truncate max-w-[200px]">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-[11px] text-[#8a8f98]/60">+{order.items.length - 2} more</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-[13px] font-medium text-[#f7f8f8]">{formatCurrency(order.pricing.total)}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 text-[11px] rounded-[4px] font-mono ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 text-[11px] rounded-[4px] font-mono ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-[#8a8f98]">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                        className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] rounded transition-colors"
                        title="View Order"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] rounded transition-colors" title="Edit Order">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => printInvoice(order)}
                        className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] rounded transition-colors"
                        title="Print Invoice"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      {order.shipping.tracking && (
                        <Button className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] rounded transition-colors" title="Track Shipping">
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12 bg-[#161824] border border-[#232636] rounded-xl">
          <FileText className="h-10 w-10 text-[#8a8f98]/40 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-[#f7f8f8] mb-1">No orders found</h3>
          <p className="text-xs text-[#8a8f98]">Try adjusting your search query or filters</p>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder ? (
        <Modal
          open={showOrderDetails}
          onClose={() => setShowOrderDetails(false)}
          title="Order Details"
          description={selectedOrder.orderNumber}
          size="xl"
        >
            <div className="p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Info */}
                <div className="bg-[#10121b] border border-[#232636] rounded-xl p-4">
                  <h4 className="text-[13px] font-semibold text-[#f7f8f8] mb-3">Customer Information</h4>
                  <div className="space-y-1.5 text-xs">
                    <p><span className="text-[#8a8f98]">Name:</span> <span className="text-[#f7f8f8] font-medium">{selectedOrder.customer.name}</span></p>
                    <p><span className="text-[#8a8f98]">Email:</span> <span className="text-[#f7f8f8] font-medium">{selectedOrder.customer.email}</span></p>
                    <p><span className="text-[#8a8f98]">Phone:</span> <span className="text-[#f7f8f8] font-medium">{selectedOrder.customer.phone}</span></p>
                  </div>
                </div>

                {/* Shipping Info */}
                <div className="bg-[#10121b] border border-[#232636] rounded-xl p-4">
                  <h4 className="text-[13px] font-semibold text-[#f7f8f8] mb-3">Shipping Address</h4>
                  <div className="space-y-1 text-xs text-[#f7f8f8]">
                    <p className="font-medium">{selectedOrder.shippingAddress.name}</p>
                    <p className="text-[#8a8f98]">{selectedOrder.shippingAddress.street}</p>
                    <p className="text-[#8a8f98]">{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zip}</p>
                    <p className="text-[#8a8f98]">{selectedOrder.shippingAddress.country}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-[13px] font-semibold text-[#f7f8f8] mb-3">Order Items</h4>
                <div className="border border-[#232636] rounded-xl overflow-hidden">
                  <div className="table-responsive overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#1b1e2c]">
                      <thead className="bg-[#10121b]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#8a8f98] uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#8a8f98] uppercase">SKU</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#8a8f98] uppercase">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#8a8f98] uppercase">Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#8a8f98] uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1b1e2c]">
                        {selectedOrder.items.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3">
                              <p className="text-[13px] font-medium text-[#f7f8f8]">{item.name}</p>
                              {item.variant && <p className="text-xs text-[#8a8f98]">{item.variant}</p>}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#8a8f98] font-mono">{item.sku}</td>
                            <td className="px-4 py-3 text-xs text-[#f7f8f8]">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 text-xs text-[#f7f8f8]">{item.quantity}</td>
                            <td className="px-4 py-3 text-xs font-medium text-[#f7f8f8]">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-[#10121b] border border-[#232636] rounded-xl p-4">
                <h4 className="text-[13px] font-semibold text-[#f7f8f8] mb-3">Order Summary</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8a8f98]">Subtotal:</span>
                    <span className="font-medium text-[#f7f8f8]">{formatCurrency(selectedOrder.pricing.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8a8f98]">Tax:</span>
                    <span className="font-medium text-[#f7f8f8]">{formatCurrency(selectedOrder.pricing.tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8a8f98]">Shipping:</span>
                    <span className="font-medium text-[#f7f8f8]">{formatCurrency(selectedOrder.pricing.shipping)}</span>
                  </div>
                  {selectedOrder.pricing.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#8a8f98]">Discount:</span>
                      <span className="font-medium text-rose-400">-{formatCurrency(selectedOrder.pricing.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-[#232636]">
                    <span className="font-medium text-[#f7f8f8]">Total:</span>
                    <span className="font-bold text-sm text-[#f7f8f8]">{formatCurrency(selectedOrder.pricing.total)}</span>
                  </div>
                </div>
              </div>

              {/* Order Timeline */}
              <div>
                <h4 className="text-[13px] font-semibold text-[#f7f8f8] mb-3">Order Timeline</h4>
                <div className="space-y-3">
                  {selectedOrder.timeline.map((event, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#5e6ad2] rounded-full mt-1.5"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-[#f7f8f8]">{event.status}</p>
                          <p className="text-[11px] text-[#8a8f98]/60">{new Date(event.timestamp).toLocaleString()}</p>
                        </div>
                        <p className="text-xs text-[#8a8f98]">{event.note}</p>
                        <p className="text-[10px] text-[#8a8f98]/40">by {event.actor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#232636]">
                <Button
                  onClick={() => printInvoice(selectedOrder)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white rounded-md text-[13px] font-medium transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Invoice</span>
                </Button>
                {selectedOrder.status === 'shipped' && (
                  <Button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[13px] font-medium transition-all">
                    <Truck className="h-3.5 w-3.5" />
                    <span>Print Shipping Label</span>
                  </Button>
                )}
                {(selectedOrder.status === 'delivered' || selectedOrder.status === 'shipped') && (
                  <Button
                    onClick={() => processRefund(selectedOrder)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 rounded-md text-[13px] transition-all"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Process Refund</span>
                  </Button>
                )}
                {selectedOrder.status === 'confirmed' && (
                  <Button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white rounded-md text-[13px] font-medium transition-all"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span>Start Processing</span>
                  </Button>
                )}
                {selectedOrder.status === 'processing' && (
                  <Button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white rounded-md text-[13px] font-medium transition-all"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Mark as Shipped</span>
                  </Button>
                )}
              </div>
            </div>
        </Modal>
      ) : null}
    </div>
  );
}
