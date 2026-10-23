'use client';

import React, { useState } from 'react';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Filter,
  Download,
  Settings2,
  ExternalLink,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Plus
} from 'lucide-react';

interface Shipment {
  orderId: string;
  customer: string;
  phone: string;
  district: string;
  courier: 'Steadfast' | 'Pathao';
  consignmentId: string;
  weight: string;
  codAmount: number;
  status: 'Pending Dispatch' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Returned';
  createdAt: string;
}

const INITIAL_SHIPMENTS: Shipment[] = [
  { orderId: '#ORD-2847', customer: 'Fatima Rahman', phone: '01712-345678', district: 'Dhanmondi, Dhaka', courier: 'Steadfast', consignmentId: 'CN-884920', weight: '0.6 kg', codAmount: 3310, status: 'In Transit', createdAt: '2024-10-21 14:30' },
  { orderId: '#ORD-2848', customer: 'Tamanna Chowdhury', phone: '01819-234567', district: 'Chittagong Sadar', courier: 'Steadfast', consignmentId: 'CN-884921', weight: '1.2 kg', codAmount: 4850, status: 'Out for Delivery', createdAt: '2024-10-21 11:20' },
  { orderId: '#ORD-2849', customer: 'Nusrat Jahan', phone: '01611-987654', district: 'Uttara, Dhaka', courier: 'Pathao', consignmentId: 'PTH-33901', weight: '0.4 kg', codAmount: 2150, status: 'Pending Dispatch', createdAt: '2024-10-21 16:15' },
  { orderId: '#ORD-2850', customer: 'Sumiya Khan', phone: '01912-112233', district: 'Sylhet Kotwali', courier: 'Steadfast', consignmentId: 'CN-884922', weight: '0.8 kg', codAmount: 2900, status: 'Delivered', createdAt: '2024-10-20 09:40' },
  { orderId: '#ORD-2851', customer: 'Rubaba Haque', phone: '01511-445566', district: 'Mirpur-10, Dhaka', courier: 'Pathao', consignmentId: 'PTH-33902', weight: '0.5 kg', codAmount: 1850, status: 'Pending Dispatch', createdAt: '2024-10-21 17:00' },
  { orderId: '#ORD-2852', customer: 'Maliha Tabassum', phone: '01715-778899', district: 'Rajshahi City', courier: 'Steadfast', consignmentId: 'CN-884923', weight: '1.0 kg', codAmount: 3400, status: 'Returned', createdAt: '2024-10-19 12:10' },
];

export default function ShippingManagementPage() {
  const [shipments, setShipments] = useState<Shipment[]>(INITIAL_SHIPMENTS);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending Dispatch' | 'In Transit' | 'Delivered' | 'Returned'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourier, setSelectedCourier] = useState<'All' | 'Steadfast' | 'Pathao'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadShipments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/shipping');
      if (res.ok) {
        const data = await res.json();
        if (data.shipments && data.shipments.length > 0) {
          setShipments(data.shipments);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch shipping data, using fallback', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadShipments();
  }, []);

  const filteredShipments = shipments.filter((s) => {
    const matchesTab = activeTab === 'All' || s.status === activeTab;
    const matchesCourier = selectedCourier === 'All' || s.courier === selectedCourier;
    const matchesSearch =
      s.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.consignmentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.district.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesCourier && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00a572] text-[#002113] font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#273647]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#4edea3] uppercase tracking-wider mb-1">
            <Truck className="w-4 h-4" />
            <span>Minsah Logistics // Courier Dispatch Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] tracking-tight">
            Shipping & Courier Management
          </h1>
          <p className="text-xs sm:text-sm text-[#908fa0] mt-0.5">
            Automated Steadfast & Pathao dispatch, tracking status webhooks, and shipping rates.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => showToast('Syncing consignment statuses from Steadfast & Pathao API...')}
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-[#c0c1ff]" />
            <span>Sync Courier Status</span>
          </button>

          <button
            onClick={() => showToast('Bulk waybills sent to thermal printer!')}
            className="px-4 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Bulk Dispatch & Waybills</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Total Dispatched</span>
            <Package className="w-4 h-4 text-[#c0c1ff]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">1,420</div>
          <div className="text-[11px] text-[#4edea3] mt-1 font-medium">+18% this month</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>In Transit (Couriers)</span>
            <Truck className="w-4 h-4 text-[#ffb690]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffb690] font-mono">184</div>
          <div className="text-[11px] text-[#908fa0] mt-1">Average SLA: 2.1 days</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Delivered Today</span>
            <CheckCircle2 className="w-4 h-4 text-[#4edea3]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#4edea3] font-mono">62</div>
          <div className="text-[11px] text-[#908fa0] mt-1">96.4% on-time delivery</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Return / RTO Rate</span>
            <RotateCcw className="w-4 h-4 text-[#ffb4ab]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">2.8%</div>
          <div className="text-[11px] text-[#4edea3] mt-1">Well below 5% benchmark</div>
        </div>
      </div>

      {/* Two Columns: Left 40% Courier Partners & Zones, Right 60% Active Shipments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Integrated Courier Partner Cards */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center justify-between">
              <span>Connected Courier Partners</span>
              <span className="text-[11px] text-[#4edea3] font-mono">2 Active</span>
            </h3>

            {/* Steadfast Courier */}
            <div className="p-4 rounded-xl bg-[#051424] border border-[#273647] hover:border-[#4edea3]/40 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00a572]/20 text-[#4edea3] flex items-center justify-center font-bold font-mono text-xs">
                    SC
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#ffffff]">Steadfast Courier</h4>
                    <p className="text-[10px] text-[#908fa0] font-mono">API v1.2 // Auto-Consignment ON</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00a572]/20 text-[#4edea3] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" /> Connected
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#273647] text-center text-xs">
                <div>
                  <div className="text-[10px] text-[#908fa0]">Parcels</div>
                  <div className="font-mono font-bold text-[#ffffff]">1,120</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#908fa0]">Success Rate</div>
                  <div className="font-mono font-bold text-[#4edea3]">95.4%</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#908fa0]">Avg Time</div>
                  <div className="font-mono font-bold text-[#ffffff]">2.1 Days</div>
                </div>
              </div>
            </div>

            {/* Pathao Courier */}
            <div className="p-4 rounded-xl bg-[#051424] border border-[#273647] hover:border-[#ec6a06]/40 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#ec6a06]/20 text-[#ffb690] flex items-center justify-center font-bold font-mono text-xs">
                    PC
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#ffffff]">Pathao Courier</h4>
                    <p className="text-[10px] text-[#908fa0] font-mono">Fast Express // Same-day Dhaka</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00a572]/20 text-[#4edea3] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" /> Connected
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#273647] text-center text-xs">
                <div>
                  <div className="text-[10px] text-[#908fa0]">Parcels</div>
                  <div className="font-mono font-bold text-[#ffffff]">300</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#908fa0]">Success Rate</div>
                  <div className="font-mono font-bold text-[#4edea3]">92.1%</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#908fa0]">Avg Time</div>
                  <div className="font-mono font-bold text-[#ffffff]">1.8 Days</div>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Zones & Delivery Rates */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#c0c1ff]" />
                <span>Delivery Zones & Charges</span>
              </h3>
              <span className="text-xs font-mono text-[#4edea3]">Standard Rates</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#051424] border border-[#273647]">
                <div>
                  <div className="font-semibold text-[#ffffff]">Inside Dhaka City</div>
                  <div className="text-[10px] text-[#908fa0]">Standard 24h delivery SLA</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[#4edea3]">৳ 60.00</div>
                  <div className="text-[10px] text-[#908fa0]">Flat fee</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#051424] border border-[#273647]">
                <div>
                  <div className="font-semibold text-[#ffffff]">Dhaka Suburbs (Savar, Gazipur, Narayanganj)</div>
                  <div className="text-[10px] text-[#908fa0]">48h delivery SLA</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[#4edea3]">৳ 80.00</div>
                  <div className="text-[10px] text-[#908fa0]">Flat fee</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#051424] border border-[#273647]">
                <div>
                  <div className="font-semibold text-[#ffffff]">Outside Dhaka (All 63 Districts)</div>
                  <div className="text-[10px] text-[#908fa0]">72h nationwide courier SLA</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[#4edea3]">৳ 130.00</div>
                  <div className="text-[10px] text-[#908fa0]">Flat fee</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#1c2b3c]/50 rounded-lg border border-[#273647] flex items-center justify-between text-xs">
              <span className="text-[#908fa0]">Free Shipping Threshold</span>
              <span className="font-mono font-bold text-[#ffffff]">Orders above ৳ 1,500</span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Active Shipments Ledger */}
        <div className="lg:col-span-7 bg-[#122131] border border-[#273647] rounded-xl overflow-hidden flex flex-col">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-[#273647] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#c0c1ff]" />
                <h3 className="text-sm font-bold text-[#ffffff]">Live Dispatch & Tracking Queue</h3>
                <span className="text-xs bg-[#1c2b3c] text-[#908fa0] px-2 py-0.5 rounded font-mono">
                  {filteredShipments.length}
                </span>
              </div>

              {/* Courier Filter Pills */}
              <div className="flex bg-[#051424] p-0.5 rounded-lg border border-[#273647] text-xs">
                {(['All', 'Steadfast', 'Pathao'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCourier(c)}
                    className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                      selectedCourier === c
                        ? 'bg-[#1c2b3c] text-[#4edea3] font-bold shadow-xs'
                        : 'text-[#908fa0] hover:text-[#d4e4fa]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#273647]">
              <div className="flex flex-wrap gap-1 text-xs">
                {(['All', 'Pending Dispatch', 'In Transit', 'Delivered', 'Returned'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-[#c0c1ff] text-[#07006c] font-bold'
                        : 'text-[#908fa0] hover:text-[#ffffff] hover:bg-[#1c2b3c]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#908fa0]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracking, order, city..."
                  className="w-full pl-8 pr-3 py-1 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#d4e4fa] placeholder-[#908fa0] focus:outline-none focus:border-[#c0c1ff]"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d1c2d] text-[#908fa0] uppercase tracking-wider font-mono text-[10px] border-b border-[#273647]">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer & Area</th>
                  <th className="py-3 px-4">Courier</th>
                  <th className="py-3 px-4">Consignment #</th>
                  <th className="py-3 px-4 text-right">COD</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#273647]">
                {filteredShipments.map((s) => (
                  <tr key={s.orderId} className="hover:bg-[#1c2b3c]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#ffffff]">{s.orderId}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#ffffff]">{s.customer}</div>
                      <div className="text-[10px] text-[#908fa0]">{s.district}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.courier === 'Steadfast'
                            ? 'bg-[#00a572]/20 text-[#4edea3]'
                            : 'bg-[#ec6a06]/20 text-[#ffb690]'
                        }`}
                      >
                        {s.courier}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#c0c1ff]">{s.consignmentId}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#ffffff]">
                      ৳ {s.codAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'Delivered'
                            ? 'bg-[#00a572]/20 text-[#4edea3]'
                            : s.status === 'In Transit' || s.status === 'Out for Delivery'
                            ? 'bg-[#c0c1ff]/20 text-[#c0c1ff]'
                            : s.status === 'Pending Dispatch'
                            ? 'bg-[#ec6a06]/20 text-[#ffb690]'
                            : 'bg-[#93000a]/20 text-[#ffb4ab]'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => showToast(`Waybill for ${s.orderId} printed!`)}
                        className="p-1.5 hover:bg-[#273647] text-[#908fa0] hover:text-[#ffffff] rounded transition-colors"
                        title="Print Waybill"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
